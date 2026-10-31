/**
 * Writes the app manifest (`app/v1/manifest.json`) for a built site: every file's path, SHA-256 and size, plus the
 * resized image variants listed in an images index (made by ../../thesarvo-private/scripts/build-app-images.ts).
 *
 *   npm run build-app-pack -- [--site dist/site] [--images <dir holding images-index.json>] [--out <dir>] [--content ../../thesarvo-content]
 *
 * The apps download each file from its normal URL with `?h=<hash>`, so nothing is copied; only the manifest is new.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildAppManifest } from '../src/app/manifest'
import type { AppImage } from '../src/app/manifest'

const args = process.argv.slice(2)
const option = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const site = path.resolve(option('site', 'dist/site'))
const imagesDir = option('images', '')
const out = path.resolve(option('out', site))
const content = path.resolve(option('content', '../../thesarvo-content'))

async function walk(dir: string, base = ''): Promise<string[]> {
  const names = await readdir(dir, { withFileTypes: true })
  const lists = await Promise.all(names.map((e) => (e.isDirectory() ? walk(path.join(dir, e.name), `${base}${e.name}/`) : [`${base}${e.name}`])))
  return lists.flat()
}

const files = await Promise.all(
  (await walk(site)).filter((p) => !p.startsWith('app/')).map(async (p) => {
    const bytes = await readFile(path.join(site, p))
    return { path: p, hash: createHash('sha256').update(bytes).digest('hex'), size: (await stat(path.join(site, p))).size }
  }),
)
const images: AppImage[] = imagesDir ? (JSON.parse(await readFile(path.join(imagesDir, 'images-index.json'), 'utf8')) as AppImage[]) : []
const commit = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: content, encoding: 'utf8' }).stdout.trim() || 'unknown'
const manifest = buildAppManifest(files, images, { contentCommit: commit, builtAt: new Date().toISOString() })
await mkdir(path.join(out, 'app/v1'), { recursive: true })
await writeFile(path.join(out, 'app/v1/manifest.json'), JSON.stringify(manifest))
console.log(`app manifest: ${manifest.files.length} files, ${manifest.images.length} images`)
