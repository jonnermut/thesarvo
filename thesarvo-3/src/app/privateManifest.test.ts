import { describe, expect, it } from 'vitest'
import type { IndexNode } from '#/guide/content/types'
import { APP_LINK_SECONDS, buildPrivateManifest } from './privateManifest'

const node = (id: string, children: IndexNode[] = []): IndexNode => ({ id, title: `P${id}`, path: `p${id}`, isGuide: id !== '7', children })
const tree = node('1', [node('2', [node('3')]), node('4'), node('7')])
const access = { '2': { groups: ['cct-members'] }, '4': { signedIn: true as const } }
const now = new Date('2026-11-01T00:00:00Z')
const loadPage = async (id: string) => ({ guide: null, body: `body ${id}`, history: [], images: { [`${id}.jpg`]: `https://signed/${id}.jpg` } })
const build = (groups: string[]) => buildPrivateManifest({ index: tree, access, groups, now, loadPage })

describe('buildPrivateManifest', () => {
  it('has only the private pages the person may read, with their photos', async () => {
    const m = await build([])
    expect(m.grafts.map((g) => g.node.id)).toEqual(['4'])
    expect(Object.keys(m.pages)).toEqual(['4'])
    expect(m.images).toEqual([{ g: '4', n: '4.jpg', u: 'https://signed/4.jpg' }])
    expect(JSON.stringify(m)).not.toContain('body 2')
  })
  it('gives group members the pages below a private page too', async () => {
    const m = await build(['cct-members'])
    expect(Object.keys(m.pages).sort()).toEqual(['2', '3', '4'])
    expect(m.images.map((i) => i.g).sort()).toEqual(['2', '3', '4'])
  })
  it('says when the photo links stop working and keeps photos out of the pages', async () => {
    const m = await build(['admins'])
    expect(m.expiresAt).toBe(new Date(now.getTime() + APP_LINK_SECONDS * 1000).toISOString())
    expect(m.pages['2']).not.toHaveProperty('images')
    expect(m.schema).toBe(1)
  })
})
