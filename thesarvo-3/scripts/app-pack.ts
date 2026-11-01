/**
 * Brings the app pack up to date after a publish: makes the small versions of any new or changed photos (uploaded as
 * `images-app/<hash>`), then writes `app/v1/manifest.json`, which lists every deployed file of the site by SHA-256 and every photo's
 * variants. The apps diff that manifest against what they hold and download the difference (plan-mobile-apps 4.1).
 *
 *   tsx scripts/app-pack.ts [--site dist/site] [--content ../../thesarvo-content] [--seed <dir>] [--dry-run]
 *
 * What the site build wrote in `--site` may be only the pages that changed: everything else is read from the bucket (hashes are kept in
 * `app/files-state.json` by ETag, so an unchanged file is not downloaded again; the photo index is `app/images-index.json`).
 * `--seed` is a folder holding `images-index.json` and `images-app/` made by ../../thesarvo-private/scripts/build-app-images.ts: used once, to
 * fill an empty index and upload variants that already exist, instead of making them again.
 * Needs ImageMagick (`magick`, or `convert` and `identify`); in the publish Action it is installed when there is a photo to make.
 * Credentials: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (the publish Action), else the AWS_PROFILE's through the CLI.
 */
import { execFile, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { buildAppManifest } from '../src/app/manifest'
import type { AppImage } from '../src/app/manifest'
import { QUALITY, SITE_PREFIXES, WIDTH, currentFiles, imagesToMake, keepOriginal, keptImages, variantKey } from '../src/app/pack'
import type { FileState, ImageEntry, Original } from '../src/app/pack'
import { credentialsFromEnv, getObject, listObjects, putObject } from '../src/aws/s3'
import type { Credentials } from '../src/aws/s3'

const run = promisify(execFile)
const args = process.argv.slice(2)
const option = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const site = path.resolve(option('site', 'dist/site'))
const content = path.resolve(option('content', '../../thesarvo-content'))
const seed = option('seed', '')
const dry = args.includes('--dry-run')
const bucket = { name: process.env.BUCKET ?? 'thesarvo-content', region: process.env.AWS_DEFAULT_REGION ?? 'ap-southeast-2' }
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex')
const md5 = (b: Buffer) => createHash('md5').update(b).digest('hex')
const exists = (p: string) => stat(p).then(() => true, () => false)

function credentials(): Credentials {
  const env = credentialsFromEnv()
  if (env) return env
  const out = spawnSync('aws', ['configure', 'export-credentials', '--format', 'process'], { encoding: 'utf8' })
  const c = JSON.parse(out.stdout) as { AccessKeyId: string; SecretAccessKey: string; SessionToken?: string }
  return { accessKeyId: c.AccessKeyId, secretAccessKey: c.SecretAccessKey, sessionToken: c.SessionToken }
}
const c = credentials()

async function inParallel<T>(items: T[], n: number, work: (item: T) => Promise<void>) {
  const queue = [...items]
  await Promise.all(Array.from({ length: n }, async () => { for (let item = queue.pop(); item !== undefined; item = queue.pop()) await work(item) }))
}

async function walk(dir: string, base = ''): Promise<string[]> {
  const names = await readdir(path.join(dir, base), { withFileTypes: true }).catch(() => [])
  return (await Promise.all(names.map((e) => (e.isDirectory() ? walk(dir, `${base}${e.name}/`) : [`${base}${e.name}`])))).flat()
}

const json = async <T>(key: string, fallback: T): Promise<T> => {
  const body = await getObject(bucket, c, key)
  return body ? (JSON.parse(body.toString('utf8')) as T) : fallback
}
const put = (key: string, body: Buffer | string, type: string, cache: string) => (dry ? Promise.resolve() : putObject(bucket, c, key, Buffer.from(body), { contentType: type, cacheControl: cache }))

// ---- the files of the site
const tree = JSON.parse(await readFile(path.join(site, 'g-data/manifest.json'), 'utf8')) as { nodes: { id: string }[]; search: { pack: string; shards: Record<string, string> } }
const nodes = new Set(tree.nodes.map((n) => n.id))
const assets = new Set((await walk(site, 'assets/')).map((p) => p))
const search = new Set([tree.search.pack, ...Object.values(tree.search.shards)].map((f) => `g-data/search/${f}`))
const remote = (await Promise.all(SITE_PREFIXES.map((p) => listObjects(bucket, c, p)))).flat()
const listed = currentFiles(remote, { assets, search, nodes })

const was = await json<FileState>('app/files-state.json', {})
const state: FileState = {}
const files: { path: string; hash: string; size: number }[] = []
let downloaded = 0
await inParallel(listed, 16, async ({ key, etag }) => {
  let bytes: Buffer | null = null
  const old = was[key]
  if (old?.m === etag) {
    state[key] = old
  } else {
    const local = (await exists(path.join(site, key))) ? await readFile(path.join(site, key)) : null
    bytes = local && md5(local) === etag ? local : await getObject(bucket, c, key)
    if (!bytes) return
    if (bytes !== local) downloaded++
    state[key] = { m: etag, h: sha(bytes), z: bytes.length }
  }
  files.push({ path: key, hash: state[key].h, size: state[key].z })
})

// ---- the photos
const originals: Original[] = []
const names = new Map<string, string[]>()
await inParallel([...nodes], 16, async (id) => {
  const local = path.join(site, 'g-data/images', `${id}.json`)
  const list = (await exists(local)) ? (JSON.parse(await readFile(local, 'utf8')) as string[]) : await json<string[]>(`g-data/images/${id}.json`, [])
  if (list.length) names.set(id, list)
})
const stored = new Map((await listObjects(bucket, c, 'images/')).map((o) => [o.key, o.etag]))
for (const [g, list] of names) for (const n of list) { const etag = stored.get(`images/${g}/${n}`); if (etag) originals.push({ g, n, etag }) }
const variantsHeld = new Set((await listObjects(bucket, c, 'images-app/')).map((o) => o.key))

const typeOf = (x: 'jpg' | 'png') => (x === 'png' ? 'image/png' : 'image/jpeg')
const upload = async (hash: string, bytes: Buffer, x: 'jpg' | 'png') => {
  if (variantsHeld.has(variantKey(hash))) return
  variantsHeld.add(variantKey(hash))
  await put(variantKey(hash), bytes, typeOf(x), 'public, max-age=31536000, immutable')
}

let index = await json<ImageEntry[] | null>('app/images-index.json', null)
if (!index && seed) {
  // The first time: the variants made on a laptop, adopted as they are.
  const made = JSON.parse(await readFile(path.join(seed, 'images-index.json'), 'utf8')) as AppImage[]
  const etags = new Map(originals.map((o) => [`${o.g}/${o.n}`, o.etag]))
  index = []
  await inParallel(made, 8, async (e) => {
    const o = etags.get(`${e.g}/${e.n}`)
    if (!o) return
    for (const v of ['s', 'm', 'l'] as const) { const h = e[v]?.[0]; if (h) await upload(h, await readFile(path.join(seed, 'images-app', h)), e.x) }
    index!.push({ ...e, o })
  })
}
index ??= []

const todo = imagesToMake(originals, index)
const entries = keptImages(originals, index)
if (todo.length) {
  let magick = ['magick'], identify = ['magick', 'identify']
  if (spawnSync('magick', ['-version']).status !== 0) {
    if (spawnSync('convert', ['-version']).status !== 0 && process.env.CI) spawnSync('sudo', ['apt-get', 'install', '-y', 'imagemagick'], { stdio: 'inherit' })
    magick = ['convert']
    identify = ['identify']
  }
  const tmp = await mkdtemp(path.join(tmpdir(), 'app-images-'))
  let n = 0
  await inParallel(todo, 4, async (o) => {
    const id = n++
    const file = path.join(tmp, `${id}-${path.basename(o.n)}`)
    try {
      const bytes = await getObject(bucket, c, `images/${o.g}/${o.n}`)
      if (!bytes) return
      await writeFile(file, bytes)
      const x = /\.png$/i.test(o.n) ? 'png' : 'jpg'
      const width = Number((await run(identify[0], [...identify.slice(1), '-format', '%w', `${file}[0]`])).stdout)
      const entry: ImageEntry = { g: o.g, n: o.n, x, o: o.etag }
      for (const v of ['s', 'm', 'l'] as const) {
        let out = bytes
        if (!keepOriginal(o.n, width, v, x)) {
          const dest = `${file}.${v}.${x}`
          const encode = x === 'png' ? ['-define', 'png:compression-level=9'] : ['-sampling-factor', '4:2:0', '-quality', String(QUALITY[v]), '-interlace', 'Plane']
          await run(magick[0], [...magick.slice(1), `${file}[0]`, '-auto-orient', '-resize', `${WIDTH[v]}x${WIDTH[v]}>`, '-strip', ...encode, `${x}:${dest}`])
          out = await readFile(dest)
        }
        entry[v] = [sha(out), out.length]
        await upload(entry[v][0], out, x)
      }
      entries.push(entry)
    } catch (err) {
      console.error('skipped', o.g, o.n, String(err).slice(0, 120))
    }
  })
  await rm(tmp, { recursive: true, force: true })
}
entries.sort((a, b) => (a.g + a.n < b.g + b.n ? -1 : 1))

// ---- the manifest goes last, so it never lists a file that is not there yet
const commit = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: content, encoding: 'utf8' }).stdout.trim() || 'unknown'
const manifest = buildAppManifest(files, entries.map(({ o: _o, ...image }) => image), { contentCommit: commit, builtAt: new Date().toISOString() })
await put('app/files-state.json', JSON.stringify(state), 'application/json', 'no-cache')
await put('app/images-index.json', JSON.stringify(entries), 'application/json', 'no-cache')
await put('app/v1/manifest.json', JSON.stringify(manifest), 'application/json; charset=utf-8', 'no-cache')
await mkdir(path.join(site, 'app/v1'), { recursive: true })
await writeFile(path.join(site, 'app/v1/manifest.json'), JSON.stringify(manifest))
console.log(`${dry ? '(dry run) ' : ''}app pack: ${manifest.files.length} files (${downloaded} read from the bucket), ${manifest.images.length} photos (${todo.length} made)`)
