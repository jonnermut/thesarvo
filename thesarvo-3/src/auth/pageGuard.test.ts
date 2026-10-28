import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { loadPrivatePage } from '#/guide/content/privatePage'
import { readableGrafts } from '#/guide/content/privateSite'
import type { Guide } from '#/guide/model/types'

const guide: Guide = { id: '3', guideStars: '', nodes: [] }
let dir = ''

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'guard-'))
  await writeFile(path.join(dir, 'index.json'), JSON.stringify({ id: 1, title: 'Root', children: [{ id: 2, title: 'Open', children: [] }, { id: 3, title: 'Members', children: [] }] }))
  for (const id of ['2', '3']) {
    await mkdir(path.join(dir, 'pages', id), { recursive: true })
    await writeFile(path.join(dir, 'pages', id, 'guide.json'), JSON.stringify({ ...guide, id }))
  }
  await writeFile(path.join(dir, 'access.json'), JSON.stringify({ '3': { groups: ['cct-members'] } }))
  vi.stubEnv('CONTENT_FORMAT', 'json')
  vi.stubEnv('CONTENT_DIR', dir)
  vi.resetModules()
})
afterAll(() => vi.unstubAllEnvs())

describe('guardPage', () => {
  it('lets anyone through to public pages and only the right groups to private ones', async () => {
    const { guardPage, pageAccess } = await import('./pageGuard')
    expect(await guardPage({ groups: [] }, '2')).toBeNull()
    expect(await guardPage({ groups: [] }, '3')).toBeInstanceOf(Response)
    expect((await guardPage({ groups: ['other'] }, '3'))?.status).toBe(403)
    expect(await guardPage({ groups: ['cct-members'] }, '3')).toBeNull()
    expect(await guardPage({ groups: ['admins'] }, '3')).toBeNull()
    expect(await pageAccess({ groups: ['cct-members'] }, '3')).toBe('allowed')
  })

  it('serves the tree and a page only through the private helpers', async () => {
    const { getFullContent, getContentSource } = await import('#/guide/content')
    const { all, access } = getFullContent()
    expect((await getContentSource().getIndex()).children.map((c) => c.id)).toEqual(['2'])
    expect(await getContentSource().getGuide('3')).toBeNull()
    expect(readableGrafts(await all.getIndex(), await access(), ['cct-members']).map((g) => g.node.id)).toEqual(['3'])
    const page = await loadPrivatePage(all, null, '3', true, async () => ({ 'a.jpg': 'https://signed' }))
    expect(page.guide?.id).toBe('3')
    expect(page.images).toEqual({ 'a.jpg': 'https://signed' })
  })
})
