import { describe, expect, it } from 'vitest'
import { DiskContentSource } from './disk'
import { ancestorIds, findByPath, flatten, imageUrl } from './paths'

const source = new DiskContentSource('fixtures')

describe('DiskContentSource', () => {
  it('builds paths from titles, keeping duplicate siblings distinct', async () => {
    const paths = flatten(await source.getIndex()).map((n) => n.path)
    expect(paths).toEqual(['', 'south-east', 'south-east/lowdina', 'south-east/lowdina-2', 'bouldering-and-more', 'some-crag'])
  })

  it('knows which pages are guides', async () => {
    const root = await source.getIndex()
    expect(findByPath(root, 'south-east/lowdina')?.isGuide).toBe(true)
    expect(findByPath(root, 'south-east')?.isGuide).toBe(false)
  })

  it('loads a guide by id, and refuses anything that is not a plain id', async () => {
    expect((await source.getGuide('167'))?.nodes.length).toBeGreaterThan(0)
    expect(await source.getGuide('999999')).toBeNull()
    expect(await source.getGuide('../package')).toBeNull()
  })

  it('lists image names without the id prefix or thumbnails', async () => {
    const names = await source.listImages('167')
    expect(names).toEqual(['a topo.jpg'])
    expect(names.some((n) => n.startsWith('t-'))).toBe(false)
  })

  it('does not read files outside the folder', async () => {
    expect(await source.readFile('../package.json')).toBeNull()
  })

  it('lists ancestors for sidebar expansion', async () => {
    expect(ancestorIds(await source.getIndex(), 'south-east/lowdina')).toEqual(['414', '1'])
  })
})

describe('imageUrl', () => {
  it('encodes names and picks the thumbnail variant', () => {
    expect(imageUrl('167', 'A b.jpg')).toBe('/content?f=167-a%20b.jpg')
    expect(imageUrl('167', 'a.jpg', true)).toBe('/content?f=167-t-a.jpg')
  })
})
