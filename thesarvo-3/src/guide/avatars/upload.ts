import { createHash } from 'node:crypto'
import { putObject } from '#/aws/s3'
import type { Bucket, Credentials } from '#/aws/s3'
import { bucketForum } from '#/forum/store'
import type { ForumStore } from '#/forum/store'
import type { AvatarMap } from './keys'

/** The browser sends a 128 px JPEG, which is a few KB; anything much bigger is not one. */
export const AVATAR_MAX_BYTES = 60_000
const RETRIES = 6

/** Where uploaded pictures live: `avatars/<sub>.<hash>.jpg` (public, immutable) and `avatars/uploaded.json`, a map from each person's sub to their file. */
export type AvatarStore = { map: ForumStore; put: (file: string, jpeg: Buffer) => Promise<void> }

export const bucketAvatars = (b: Bucket, c: Credentials): AvatarStore => ({
  map: bucketForum(b, c, 'avatars/', 'public, max-age=60'),
  put: (file, jpeg) => putObject(b, c, `avatars/${file}`, jpeg, { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000, immutable' }),
})

export class BadPicture extends Error {}

/** The bytes of a `data:image/jpeg;base64,…` URL, or a refusal. Only the JPEG signature is checked: the file is only ever served as image/jpeg. */
export function jpegOf(dataUrl: unknown): Buffer {
  const m = typeof dataUrl === 'string' ? /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl) : null
  if (!m) throw new BadPicture('That is not a JPEG picture')
  const bytes = Buffer.from(m[1], 'base64')
  if (bytes.length > AVATAR_MAX_BYTES) throw new BadPicture('That picture is too big')
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new BadPicture('That is not a JPEG picture')
  return bytes
}

async function change(store: AvatarStore, edit: (map: AvatarMap) => AvatarMap) {
  for (let i = 0; i < RETRIES; i++) {
    const got = await store.map.read('uploaded.json')
    const next = edit({ ...((got?.value ?? {}) as AvatarMap) })
    if (await store.map.write('uploaded.json', next, got?.tag ?? null)) return
  }
  throw new Error('Could not save the picture: too many simultaneous changes')
}

/** Saves someone's picture and points their sub at it. */
export async function saveAvatar(store: AvatarStore, sub: string, dataUrl: unknown): Promise<string> {
  const jpeg = jpegOf(dataUrl)
  const file = `${sub.replace(/\W/g, '_')}.${createHash('sha256').update(jpeg).digest('hex').slice(0, 10)}.jpg`
  await store.put(file, jpeg)
  await change(store, (map) => ({ ...map, [sub]: file }))
  return file
}

/** Forgets their uploaded picture (the old file stays; it is tiny). The imported or Google one, if any, shows again. */
export const removeAvatar = (store: AvatarStore, sub: string) =>
  change(store, (map) => {
    delete map[sub]
    return map
  })
