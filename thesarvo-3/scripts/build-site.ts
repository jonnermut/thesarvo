/**
 * Builds the static site (rendered pages, JS and CSS) from a checkout of the content repo into dist/client.
 *
 *   npm run build-site -- [--dir ../../thesarvo-content] [--images https://thesarvo-content.s3.ap-southeast-2.amazonaws.com/images]
 *
 * Pages are rendered at build time; the browser loads the same data as plain files from /g-data.
 */
import { spawnSync } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { flatten } from '../src/guide/content/paths'
import { JsonContentSource } from '../src/guide/content/json'
import { formatJson } from '../src/guide/content/syncFeed'

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
await writeFile(path.join(data, 'index.json'), formatJson(index))
let guides = 0
for (const node of flatten(index).filter((n) => n.isGuide)) {
  await writeFile(path.join(data, 'guide', `${node.id}.json`), JSON.stringify(await source.getGuide(node.id)))
  await writeFile(path.join(data, 'images', `${node.id}.json`), JSON.stringify(await source.listImages(node.id)))
  guides++
}
console.log(`Wrote data for ${guides} guides`)

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
