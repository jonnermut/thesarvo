import { describe, expect, it } from 'vitest'
import { currentFiles, imagesToMake, keepOriginal, keptImages } from './pack'
import type { ImageEntry } from './pack'

const l = (...keys: string[]) => keys.map((key) => ({ key, etag: 'x' }))
const keys = (a: { key: string }[]) => a.map((f) => f.key)

describe('currentFiles', () => {
  const now = { assets: new Set(['assets/new.js']), search: new Set(['g-data/search/pack.2.json']), nodes: new Set(['100']) }

  it('drops old bundles and search files, and data of pages that are gone', () => {
    const remote = l('assets/old.js', 'assets/new.js', 'g-data/search/pack.1.json', 'g-data/search/pack.2.json', 'g-data/guide/100.json', 'g-data/guide/999.json', 'g-data/kml/100.kml', 'g-data/kml/999.gpx', 'g-data/manifest.json', 'g/index.html', 'index.html')
    expect(keys(currentFiles(remote, now))).toEqual(['assets/new.js', 'g-data/search/pack.2.json', 'g-data/guide/100.json', 'g-data/kml/100.kml', 'g-data/manifest.json', 'g/index.html', 'index.html'])
  })
})

describe('images', () => {
  const entry = (g: string, n: string, o: string): ImageEntry => ({ g, n, x: 'jpg', o, s: ['a', 1] })

  it('makes variants for new and changed photos only', () => {
    const originals = [
      { g: '1', n: 'a.jpg', etag: 'e1' },
      { g: '1', n: 'b.jpg', etag: 'e2' },
      { g: '2', n: 'c.png', etag: 'e3' },
    ]
    const index = [entry('1', 'a.jpg', 'e1'), entry('1', 'b.jpg', 'old')]
    expect(imagesToMake(originals, index).map((o) => o.n)).toEqual(['b.jpg', 'c.png'])
  })

  it('keeps only entries whose photo is still there unchanged', () => {
    const originals = [{ g: '1', n: 'a.jpg', etag: 'e1' }, { g: '1', n: 'b.jpg', etag: 'new' }]
    const index = [entry('1', 'a.jpg', 'e1'), entry('1', 'b.jpg', 'old'), entry('9', 'gone.jpg', 'e')]
    expect(keptImages(originals, index).map((e) => e.n)).toEqual(['a.jpg'])
  })

  it('uses the original when it is small and already the right type', () => {
    expect(keepOriginal('x.jpg', 400, 's', 'jpg')).toBe(true)
    expect(keepOriginal('x.jpg', 900, 's', 'jpg')).toBe(false)
    expect(keepOriginal('x.gif', 100, 's', 'jpg')).toBe(false)
    expect(keepOriginal('x.png', 100, 's', 'png')).toBe(true)
  })
})
