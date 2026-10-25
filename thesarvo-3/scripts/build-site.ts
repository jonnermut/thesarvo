/**
 * Builds the static site (rendered pages, JS and CSS) from a checkout of the content repo into dist/client.
 *
 *   npm run build-site -- [--dir ../../thesarvo-content] [--images https://thesarvo-content.s3.ap-southeast-2.amazonaws.com/images]
 *
 * Pages are rendered at build time; the browser loads the same data as plain files from /g-data.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { flatten } from '../src/guide/content/paths'
import { JsonContentSource } from '../src/guide/content/json'
import { buildManifest } from '../src/guide/content/manifest'
import { guideShard } from '../src/guide/search/shard'
import type { Pack } from '../src/guide/search/shard'

const args = process.argv.slice(2)
const option = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const dir = path.resolve(option('dir', '../../thesarvo-content'))
const images = option('images', 'https://thesarvo-content.s3.ap-southeast-2.amazonaws.com/images')

const source = new JsonContentSource(dir)
const index = await source.getIndex()
const data = path.resolve('public/g-data')
await rm(data, { recursive: true, force: true })
await mkdir(path.join(data, 'guide'), { recursive: true })
await mkdir(path.join(data, 'images'), { recursive: true })
await mkdir(path.join(data, 'page'), { recursive: true })
await mkdir(path.join(data, 'search'), { recursive: true })
let guides = 0
const pack: Pack = []
for (const node of flatten(index).filter((n) => n.isGuide)) {
  const guide = await source.getGuide(node.id)
  await writeFile(path.join(data, 'guide', `${node.id}.json`), JSON.stringify(guide))
  await writeFile(path.join(data, 'images', `${node.id}.json`), JSON.stringify(await source.listImages(node.id)))
  if (guide) pack.push(guideShard(guide))
  guides++
}
// Search data is named by its content, so browsers keep it until it changes.
const packJson = JSON.stringify(pack)
const packFile = `pack.${createHash('sha256').update(packJson).digest('hex').slice(0, 10)}.json`
await writeFile(path.join(data, 'search', packFile), packJson)
// The tree and stats every page refreshes itself from after loading.
const manifest = { ...(await buildManifest(index, (id) => source.getGuide(id))), search: { pack: packFile, shards: {}, removed: [] } }
await writeFile(path.join(data, 'manifest.json'), JSON.stringify(manifest))
for (const node of flatten(index).filter((n) => !n.isGuide)) {
  await writeFile(path.join(data, 'page', `${node.id}.json`), JSON.stringify(await source.getPageBody(node.id)))
}
console.log(`Wrote data for ${guides} guides and ${flatten(index).length - guides} other pages`)

const build = spawnSync('npx', ['vite', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, CONTENT_DIR: dir, VITE_STATIC_SITE: '1', VITE_IMAGE_BASE: images },
})
if (build.status) process.exit(build.status)

// The bucket's front door: / goes to the guides.
await writeFile(
  'dist/client/index.html',
  '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/g/"><title>thesarvo</title><a href="/g/">Tasmanian climbing guides</a>\n',
)
