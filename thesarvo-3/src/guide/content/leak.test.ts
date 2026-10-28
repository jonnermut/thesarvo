import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, it } from 'vitest'
import { guideShard } from '#/guide/search/shard'
import { treeToKml } from '#/guide/view/kml'
import type { Guide } from '#/guide/model/types'
import { treeHashes } from './incremental'
import { publicJsonSource } from './json'
import { buildManifest } from './manifest'
import { flatten } from './paths'

const SECRET = 'Zxqsecretcrag'

const guide = (id: string, name: string): Guide => ({
  id,
  guideStars: '',
  nodes: [
    { type: 'header', id: 'h', name, rock: '', sun: '', walk: '', access: `${name} access`, camping: '', acknowledgement: '', intro: '', history: '', autonumber: '' },
    { type: 'climb', id: 'c', name: `${name} Direct`, number: '1', grade: '20', extra: '', length: '', stars: '**', fa: '', text: '' },
    { type: 'gps', id: 'g', points: [{ code: 'P', description: name, latitude: '-42.1', longitude: '147.1', other: {} }] as never, lines: [] },
  ],
})

/** Everything the static build writes from a source, as one string: the manifest, search entries, KML, hashes and each page's data. */
async function builtOutput(dir: string) {
  const source = publicJsonSource(dir)
  const index = await source.getIndex()
  const guideOf = (id: string) => source.getGuide(id)
  const out: unknown[] = [index, await buildManifest(index, guideOf), await treeHashes(index, async (n) => JSON.stringify([await guideOf(n.id), await source.getPageBody(n.id), await source.getHistory(n.id)]), String)]
  for (const n of flatten(index)) {
    out.push(await guideOf(n.id), await source.getPageBody(n.id), await source.getHistory(n.id), await source.listImages(n.id), await treeToKml(n, guideOf))
    const g = await guideOf(n.id)
    if (g) out.push(guideShard(g))
  }
  return JSON.stringify(out)
}

it('builds nothing about a restricted page, a draft, or anything below them', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'leak-'))
  const raw = { id: 1, title: 'Root', children: [
    { id: 2, title: 'Open Crag', children: [] },
    { id: 3, title: `${SECRET} members`, children: [{ id: 4, title: `${SECRET} below`, children: [] }] },
    { id: 5, title: `${SECRET} draft prose`, children: [] },
  ] }
  await writeFile(path.join(dir, 'index.json'), JSON.stringify(raw))
  for (const [id, name] of [['2', 'Open'], ['3', `${SECRET} one`], ['4', `${SECRET} two`]]) {
    await mkdir(path.join(dir, 'pages', id), { recursive: true })
    await writeFile(path.join(dir, 'pages', id, 'guide.json'), JSON.stringify(guide(id, name)))
    await writeFile(path.join(dir, 'pages', id, 'history.json'), JSON.stringify([{ session: 's', description: `${name} edit` }]))
  }
  await mkdir(path.join(dir, 'pages', '5'), { recursive: true })
  await writeFile(path.join(dir, 'pages', '5', 'page.html'), `<p>${SECRET} body</p>`)

  const before = await builtOutput(dir)
  expect(before).toContain(SECRET) // without access.json everything is public: the test would pass for nothing otherwise

  await writeFile(path.join(dir, 'access.json'), JSON.stringify({ '3': { groups: ['cct-members'] }, '5': { draft: true } }))
  const after = await builtOutput(dir)
  expect(after).not.toContain(SECRET)
  expect(after).not.toMatch(/"id":"[345]"/)
  expect(after).toContain('Open')
})
