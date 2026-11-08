import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function load(staticSite: boolean, body: unknown) {
  vi.stubEnv('VITE_STATIC_SITE', staticSite ? '1' : '')
  const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify(body))))
  vi.stubGlobal('fetch', fetchMock)
  return { client: await import('./client'), fetchMock }
}

describe('home feeds', () => {
  it('read static files on the static site, never the API', async () => {
    const { client, fetchMock } = await load(true, [])
    await client.recentThreads()
    await client.notices()
    expect(fetchMock.mock.calls.map((c) => (c as unknown[])[0])).toEqual(['/g-data/forum-recent.json', '/g-data/forum-notices.json'])
  })

  it('use the API in development', async () => {
    const { client, fetchMock } = await load(false, [])
    await client.recentThreads()
    expect((fetchMock.mock.calls[0] as unknown[])[0]).toBe('/g/api/forum-recent')
  })

  it('drop notices that have run out', async () => {
    const author = { sub: 'a', name: 'A' }
    const { client } = await load(true, [
      { id: '1', title: 'Old', author, at: '2020-01-01T00:00:00Z', until: '2020-02-01T00:00:00Z' },
      { id: '2', title: 'Live', author, at: '2020-01-01T00:00:00Z', until: '2999-01-01T00:00:00Z' },
    ])
    expect((await client.notices()).map((n) => n.id)).toEqual(['2'])
  })

  it('are empty when the file is missing', async () => {
    vi.stubEnv('VITE_STATIC_SITE', '1')
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 403 })))
    expect(await (await import('./client')).recentThreads()).toEqual([])
  })
})
