/**
 * Builds the static site (rendered pages, JS and CSS) from a checkout of the content repo into dist/site.
 *
 *   npm run build-site -- [--dir ../../thesarvo-content] [--out dist/site]
 *                         [--package dist] [--incremental] [--since http://thesarvo-content.s3-website-ap-southeast-2.amazonaws.com/g-data]
 *
 * Pages are rendered at build time, by the app's server bundle; the browser loads the same data as plain files from /g-data.
 * The app comes from `--package`, a folder holding client/ (the JS and CSS), server/ and, built elsewhere, app.json with the
 * app's id. Without it the app is built here first with vite (into dist) and its id is its git tree.
 * With --incremental it reads what the deployed site was built from (`--since`, a URL or folder
 * holding its manifest.json and build.json) and renders only the pages that changed; the app's
 * code must be unchanged since then, or it builds everything. <out>/deploy.json
 * tells deploy-changed.ts which kind of build it is and which pages to remove.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { ACCOUNT_PATH, CALLBACK_PATH, PASSWORD_PATH } from '../src/auth/paths'
import { pagesToRebuild, treeHashes } from '../src/guide/content/incremental'
import type { BuildInfo } from '../src/guide/content/incremental'
import { JsonContentSource } from '../src/guide/content/json'
import { buildManifest } from '../src/guide/content/manifest'
import type { Manifest } from '../src/guide/content/manifest'
import { flatten, GUIDE_PREFIX, guideUrl } from '../src/guide/content/paths'
import type { IndexNode } from '../src/guide/content/types'
import type { Guide } from '../src/guide/model/types'
import { treeToKml } from '../src/guide/view/kml'
import { guideShard } from '../src/guide/search/shard'
import type { Pack, SearchFiles } from '../src/guide/search/shard'

const args = process.argv.slice(2)
const option = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const dir = path.resolve(option('dir', '../../thesarvo-content'))
const out = path.resolve(option('out', 'dist/site'))
const prebuilt = option('package', '')
const since = option('since', 'http://thesarvo-content.s3-website-ap-southeast-2.amazonaws.com/g-data')
const incremental = args.includes('--incremental')
/** Changed guides get their own search shard until there are this many; then the pack is rewritten. */
const MAX_SHARDS = 20

const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 10)
const git = (cwd: string, ...a: string[]) => spawnSync('git', a, { cwd, encoding: 'utf8' }).stdout.trim()
const dirty = (cwd: string) => git(cwd, 'status', '--porcelain', '--', '.') !== ''

async function deployed<T>(file: string): Promise<T | null> {
  try {
    if (!/^https?:/.test(since)) return JSON.parse(await readFile(path.join(since, file), 'utf8')) as T
    const res = await fetch(`${since}/${file}`, { cache: 'no-store' })
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null
  }
}

const source = new JsonContentSource(dir)
const index = await source.getIndex()
const nodes = flatten(index)
const guideCache = new Map<string, Promise<Guide | null>>()
const guideOf = (id: string) => guideCache.get(id) ?? guideCache.set(id, source.getGuide(id)).get(id)!

// The app's committed code: anything uncommitted makes this build unlike any other.
const app = prebuilt
  ? (JSON.parse(await readFile(path.join(prebuilt, 'app.json'), 'utf8')) as { app: string }).app
  : dirty('.') ? `uncommitted-${Date.now()}` : git('.', 'rev-parse', 'HEAD:./')
const build: BuildInfo = {
  app,
  content: git(dir, 'rev-parse', 'HEAD') + (dirty(dir) ? '+' : ''),
  // When that commit was made: browsers compare it with their own saves to tell when the site shows them.
  contentAt: git(dir, 'log', '-1', '--format=%cI'),
  nodes: await treeHashes(index, async (n) => JSON.stringify([n.isGuide ? await guideOf(n.id) : null, await source.getPageBody(n.id), await source.getHistory(n.id)]), hash),
}

const before = incremental ? await deployed<BuildInfo>('build.json') : null
const beforeManifest = before?.app === app ? await deployed<Manifest>('manifest.json') : null
const partial = !!(before && beforeManifest?.search)
if (incremental && !partial) console.log(before ? 'The app changed since the deployed build: building everything' : 'No deployed build found: building everything')
const pages = partial ? pagesToRebuild(index, before.nodes, build.nodes) : nodes

const data = path.join(out, 'g-data')
await rm(out, { recursive: true, force: true })
for (const sub of ['guide', 'history', 'images', 'kml', 'page', 'search']) await mkdir(path.join(data, sub), { recursive: true })
const writeJson = (file: string, value: unknown) => writeFile(path.join(data, file), JSON.stringify(value))

for (const node of pages) {
  if (node.isGuide) {
    await writeJson(`guide/${node.id}.json`, await guideOf(node.id))
    await writeJson(`images/${node.id}.json`, await source.listImages(node.id))
  } else await writeJson(`page/${node.id}.json`, await source.getPageBody(node.id))
  // Its page menu's History reads this as it is: the saves wrote everything it shows.
  const history = await source.getHistory(node.id)
  if (history.length) await writeJson(`history/${node.id}.json`, history)
}

// Google Earth files of everything below each contents page, rewritten every build as any guide's GPS may change them.
for (const node of nodes.filter((n) => n.children.length)) {
  const kml = await treeToKml(node, guideOf)
  if (kml) await writeFile(path.join(data, 'kml', `${node.id}.kml`), kml)
}

// Search data is named by its content, so browsers keep it until it changes.
async function writePack(): Promise<SearchFiles> {
  const pack: Pack = []
  for (const node of nodes.filter((n) => n.isGuide)) {
    const guide = await guideOf(node.id)
    if (guide) pack.push(guideShard(guide))
  }
  const json = JSON.stringify(pack)
  const file = `pack.${hash(json)}.json`
  await writeFile(path.join(data, 'search', file), json)
  return { pack: file, shards: {}, removed: [] }
}

async function writeShards(was: SearchFiles, guidesBefore: Set<string>): Promise<SearchFiles> {
  const guides = new Set(nodes.filter((n) => n.isGuide).map((n) => n.id))
  const shards = Object.fromEntries(Object.entries(was.shards).filter(([id]) => guides.has(id)))
  for (const id of guides) {
    if (before!.nodes[id]?.[0] === build.nodes[id][0]) continue
    const guide = await guideOf(id)
    if (!guide) continue
    const json = JSON.stringify(guideShard(guide))
    shards[id] = `${id}.${hash(json)}.json`
    await writeFile(path.join(data, 'search', shards[id]), json)
  }
  const removed = [...new Set([...was.removed, ...guidesBefore])].filter((id) => !guides.has(id))
  return Object.keys(shards).length > MAX_SHARDS ? writePack() : { pack: was.pack, shards, removed }
}

const search = partial
  ? await writeShards(beforeManifest.search!, new Set(beforeManifest.nodes.filter((n) => n.isGuide).map((n) => n.id)))
  : await writePack()
// The tree and stats every page refreshes itself from after loading.
await writeJson('manifest.json', { ...(await buildManifest(index, guideOf)), search } satisfies Manifest)
await writeJson('build.json', build)

const url = (n: Pick<IndexNode, 'path'>) => (n.path ? guideUrl(n) : GUIDE_PREFIX)
const paths = new Set(nodes.map(url))
const remove = partial ? beforeManifest.nodes.map(url).filter((p) => !paths.has(p)) : []
console.log(
  partial
    ? `Changed since the deployed build: ${pages.length} pages to render, ${Object.keys(search.shards).length} search shards, ${remove.length} pages to remove`
    : `Wrote data for all ${nodes.length} pages`,
)

// The app, built here unless it comes ready-made: the static site's server bundle carries its dependencies and renders the pages itself.
let pkg = prebuilt
if (!pkg) {
  pkg = path.resolve('dist')
  const vite = spawnSync('npx', ['vite', 'build'], { stdio: 'inherit', env: { ...process.env, VITE_STATIC_SITE: '1', VITE_IMAGE_BASE: '/images', PRERENDER_PATHS: '' } })
  if (vite.status) process.exit(vite.status)
}
await cp(path.join(pkg, 'client'), out, { recursive: true })
process.env.CONTENT_DIR = dir
const { default: renderer } = (await import(pathToFileURL(path.resolve(pkg, 'server/server.js')).href)) as { default: { fetch: (r: Request) => Promise<Response> } }
const fixed = [GUIDE_PREFIX, `${GUIDE_PREFIX}/search`, CALLBACK_PATH, PASSWORD_PATH, ACCOUNT_PATH]
const render = partial ? pages.map(url) : [...new Set([...fixed, ...nodes.map(url)])]
let next = 0
await Promise.all(
  Array.from({ length: 8 }, async () => {
    for (let p = render[next++]; p; p = render[next++]) {
      const res = await renderer.fetch(new Request(`http://localhost${p}/`))
      if (res.status !== 200) throw new Error(`rendering ${p} gave ${res.status}`)
      await mkdir(path.join(out, p), { recursive: true })
      await writeFile(path.join(out, p, 'index.html'), await res.text())
    }
  }),
)
console.log(`Rendered ${render.length} pages`)

// The bucket's front door: / goes to the guides.
await writeFile(
  path.join(out, 'index.html'),
  '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/g/"><title>thesarvo</title><a href="/g/">Tasmanian climbing guides</a>\n',
)
// For deploy-changed.ts: a partial build must not delete what it did not build. Not uploaded.
await writeFile(path.join(out, 'deploy.json'), JSON.stringify({ incremental: partial, remove: remove.map((p) => `${p.slice(1)}/index.html`) }))
