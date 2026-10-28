import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getObjectTagged, putObjectIf } from '#/aws/s3'
import type { Bucket, Credentials } from '#/aws/s3'
import { imageBucket } from '#/guide/content/bucketImages'

/**
 * Where the forum's JSON lives: `index.json` (thread metas), `recent.json` and `threads/<id>.json`. Reads give a version tag;
 * a write names the tag it read (null: the file must not exist yet) and is refused with false when someone wrote since.
 */
export type ForumStore = {
  read: (name: string) => Promise<{ value: unknown; tag: string } | null>
  write: (name: string, value: unknown, tag: string | null) => Promise<boolean>
}

const PREFIX = 'private/forum/'
const JSON_TYPE = { contentType: 'application/json', cacheControl: 'no-store' }

/** The forum in the bucket under `private/forum/` (never served publicly); null where the bucket is not set up. */
export function bucketForum(b: Bucket, c: Credentials): ForumStore {
  return {
    async read(name) {
      const got = await getObjectTagged(b, c, PREFIX + name)
      return got && { value: JSON.parse(got.body.toString('utf8')) as unknown, tag: got.etag }
    },
    write: (name, value, tag) => putObjectIf(b, c, PREFIX + name, Buffer.from(JSON.stringify(value)), tag, JSON_TYPE),
  }
}

/** For development: a gitignored folder, seeded from the content repo's `forum/` when a file is not there. Writes are not atomic across processes. */
export function localForum(dir: string, seedDir: string): ForumStore {
  const version = (text: string) => createHash('md5').update(text).digest('hex')
  return {
    async read(name) {
      for (const d of [dir, seedDir]) {
        const text = await readFile(path.join(d, name), 'utf8').catch(() => null)
        if (text !== null) return { value: JSON.parse(text) as unknown, tag: version(text) }
      }
      return null
    },
    async write(name, value, tag) {
      const now = await this.read(name)
      if ((now?.tag ?? null) !== tag) return false
      const file = path.join(dir, name)
      await mkdir(path.dirname(file), { recursive: true })
      await writeFile(`${file}.tmp`, JSON.stringify(value))
      await rename(`${file}.tmp`, file)
      return true
    },
  }
}

/** The store this server uses: the bucket on the Lambda, a folder in development, null elsewhere (the API answers 501). */
export function forumStore(env = process.env): ForumStore | null {
  const b = imageBucket(env)
  if (b) return bucketForum(b.bucket, b.creds)
  return env.NODE_ENV === 'production' ? null : localForum(path.resolve('.saves/forum'), path.resolve(env.CONTENT_DIR ?? '../../thesarvo-content', 'forum'))
}
