import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, it } from 'vitest'
import { JsonContentSource } from './json'

it('reads the content repo layout', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'content-'))
  await mkdir(path.join(dir, 'pages', '2'), { recursive: true })
  await writeFile(path.join(dir, 'index.json'), JSON.stringify({ id: 1, title: 'Root', children: [{ id: 2, title: 'A Crag', children: [] }] }))
  await writeFile(
    path.join(dir, 'pages', '2', 'guide.json'),
    JSON.stringify({ id: '2', guideStars: '', nodes: [{ type: 'image', id: 'x', src: 'topo.jpg', paths: [], rects: [] }] }),
  )
  const source = new JsonContentSource(dir)
  const root = await source.getIndex()
  expect(root.children[0]).toMatchObject({ path: 'a-crag', isGuide: true })
  expect((await source.getGuide('2'))?.id).toBe('2')
  expect(await source.getGuide('../x')).toBeNull()
  expect(await source.listImages('2')).toEqual(['topo.jpg'])
})
