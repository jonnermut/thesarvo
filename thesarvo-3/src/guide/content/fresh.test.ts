import { expect, it } from 'vitest'
import { freshSource } from './fresh'
import type { ContentSource, IndexNode } from './types'

const node = (id: string, isGuide: boolean, children: IndexNode[] = []): IndexNode => ({ id, title: `T${id}`, path: '', isGuide, children })
const bundled = (): ContentSource => ({
  getIndex: () => Promise.resolve(node('1', false, [node('2', true)])),
  getGuide: (id) => Promise.resolve(id === '2' ? { id: '2', guideStars: '', nodes: [] } : null),
  getPageBody: () => Promise.resolve(null),
  getHistory: () => Promise.resolve([]),
  listImages: () => Promise.resolve([]),
  saveImage: () => Promise.reject(new Error('read-only')),
  readFile: () => Promise.resolve(null),
})
const index = { id: 1, title: 'Root', children: [{ id: 2, title: 'A Crag', children: [{ id: 9000000021, title: 'New', children: [] }] }] }

it('shows a page added after the deploy, and the new access rules', async () => {
  const files: Record<string, string> = {
    'index.json': JSON.stringify(index),
    'access.json': JSON.stringify({ 9000000021: { groups: ['admins'] } }),
    'pages/9000000021/guide.json': JSON.stringify({ id: '9000000021', guideStars: '', nodes: [] }),
  }
  const { source, access } = freshSource(bundled(), () => Promise.resolve({}), (p) => Promise.resolve(files[p] ?? null))
  const root = await source.getIndex()
  expect(root.children[0].children[0]).toMatchObject({ id: '9000000021', isGuide: true, path: 'a-crag/new' })
  expect(Object.keys(await access())).toEqual(['9000000021'])
  expect((await source.getGuide('9000000021'))?.id).toBe('9000000021')
  expect((await source.getGuide('2'))?.id).toBe('2')
})

it('falls back to the bundled content, and its access rules, when the repo cannot be read', async () => {
  const bundledAccess = { 2: { groups: ['admins'] } }
  const { source, access } = freshSource(bundled(), () => Promise.resolve(bundledAccess), () => Promise.reject(new Error('GitHub: 500')))
  expect((await source.getIndex()).children).toHaveLength(1)
  expect(await access()).toEqual(bundledAccess)
  expect((await source.getGuide('2'))?.id).toBe('2')
})

it('caches for the ttl, then reads again', async () => {
  let reads = 0, t = 0
  const read = (p: string) => (p === 'access.json' ? (reads++, Promise.resolve('{}')) : Promise.resolve(null))
  const { access } = freshSource(bundled(), () => Promise.resolve({}), read, 1000, () => t)
  await access(); await access()
  expect(reads).toBe(1)
  t = 1001
  await access()
  expect(reads).toBe(2)
})
