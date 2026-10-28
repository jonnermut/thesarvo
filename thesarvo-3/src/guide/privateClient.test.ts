// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Graft } from './content/privateSite'

let signedIn = true
vi.mock('#/auth/session', () => ({ currentUser: () => (signedIn ? { sub: 'u1' } : null), getIdToken: () => Promise.resolve(signedIn ? 'tok' : null) }))

const grafts: Graft[] = [{ parent: '1', before: null, node: { id: '3', title: 'Members', path: 'members', isGuide: true, private: true, children: [{ id: '4', title: 'Below', path: 'members/below', isGuide: true, private: true, children: [] }] } }]
const calls: string[] = []

beforeEach(() => {
  vi.resetModules()
  signedIn = true
  calls.length = 0
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
    calls.push(`${url} ${(init.headers as Record<string, string>).authorization}`)
    const body = url.includes('private-tree') ? grafts : { guide: { id: '3', guideStars: '', nodes: [] }, body: null, history: [], images: { 'a.jpg': 'https://signed/a.jpg' } }
    return Promise.resolve(new Response(JSON.stringify(body)))
  })
  vi.stubEnv('SSR', '')
})

describe('private client', () => {
  it('fetches the tree with the ID token once and knows which ids are private, below pages too', async () => {
    const c = await import('./privateClient')
    expect(await c.fetchGrafts()).toEqual(grafts)
    await c.fetchGrafts()
    expect(calls).toEqual(['/g/api/private-tree Bearer tok'])
    expect(c.isPrivateId('3') && c.isPrivateId('4') && !c.isPrivateId('9')).toBe(true)
  })

  it('has nothing private when signed out, and makes no request', async () => {
    signedIn = false
    const c = await import('./privateClient')
    expect(await c.fetchGrafts()).toEqual([])
    expect(calls).toEqual([])
  })

  it('shares a page fetch and routes its photos through the signed links', async () => {
    const c = await import('./privateClient')
    const { imageUrl: url } = await import('./content/paths')
    const [a, b] = await Promise.all([c.fetchPrivatePage('3'), c.fetchPrivatePage('3')])
    expect(a).toBe(b)
    expect(calls).toHaveLength(1)
    expect(url('3', 'a.jpg')).toBe('https://signed/a.jpg')
  })
})
