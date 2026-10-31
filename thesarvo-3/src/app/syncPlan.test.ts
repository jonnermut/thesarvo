import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildAppManifest, categoryOf } from './manifest'
import { diff, generation, textComplete } from './syncPlan'

const load = (f: string) => JSON.parse(readFileSync(`test-vectors/sync/${f}`, 'utf8'))
const inputs = load('inputs.json')
const expected = load('expected.json')

describe('shared sync test vectors (the Swift and Kotlin clients must give the same answers)', () => {
  inputs.forEach((c: { name: string; manifest: Parameters<typeof diff>[0]; present: string[]; policy: Parameters<typeof diff>[2] }, i: number) => {
    it(c.name, () => {
      const d = diff(c.manifest, c.present, c.policy)
      const e = expected[i]
      expect(d.downloads.map((x) => [x.kind, x.path, x.size])).toEqual(e.downloads)
      expect(d.deletions.length).toBe(e.deletions)
      expect(textComplete(c.manifest, c.present)).toBe(e.textComplete)
      expect(Object.keys(generation(c.manifest, c.present).paths).length).toBe(e.pathsInGeneration)
    })
  })
})

describe('buildAppManifest', () => {
  it('leaves out online-only and bookkeeping files, sorts, and categorises', () => {
    const f = (path: string) => ({ path, hash: 'h' + path, size: 1 })
    const m = buildAppManifest([f('g-data/history/1.json'), f('g/b/index.html'), f('deploy.json'), f('assets/x.js'), f('g-data/guide/1.json'), f('g-data/build.json')], [], { contentCommit: 'c', builtAt: 't' })
    expect(m.files.map((x) => [x.p, x.c])).toEqual([['assets/x.js', 'shell'], ['g-data/guide/1.json', 'data'], ['g/b/index.html', 'html']])
    expect(categoryOf('robots.txt')).toBeNull()
  })
})
