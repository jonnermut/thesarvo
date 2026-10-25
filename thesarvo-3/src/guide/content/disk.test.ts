import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DiskContentSource } from './disk'
import { ancestorIds, findByPath, flatten, imageUrl, uploadName } from './paths'

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
    expect(imageUrl('167', 'A b.jpg')).toBe('/g/content?f=167-a%20b.jpg')
    expect(imageUrl('167', 'a.jpg', true)).toBe('/g/content?f=167-t-a.jpg')
  })
})

describe('image uploads', () => {
  it('cleans names and only accepts images', () => {
    expect(uploadName('C:\\pics\\My Topo!.JPG')).toBe('my topo_.jpg')
    expect(uploadName('notes.txt')).toBeNull()
    expect(uploadName('.jpg')).toBeNull()
  })

  it('stores uploads apart from content, never overwriting', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'uploads-'))
    const up = new DiskContentSource('fixtures', dir)
    expect(await up.saveImage('167', 'New.png', new Uint8Array([1, 2]))).toBe('new.png')
    expect(await up.saveImage('167', 'New.png', new Uint8Array([3]))).toBe('new-2.png')
    expect(await up.listImages('167')).toEqual(['a topo.jpg', 'new-2.png', 'new.png'])
    expect([...((await up.readFile('167-new.png')) ?? [])]).toEqual([1, 2])
    expect((await readFile(path.join(dir, '167-new-2.png')))[0]).toBe(3)
    await expect(up.saveImage('x', 'a.png', new Uint8Array())).rejects.toThrow()
  })
})
