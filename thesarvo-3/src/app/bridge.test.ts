import { describe, expect, it, vi } from 'vitest'
import { installBridge } from './bridge'

type W = NonNullable<Parameters<typeof installBridge>[0]>
type Reply = (id: number, status: number, body: string) => void
/** A window whose native handler is `native(message, reply)`. */
const fakeWindow = (native: (m: { id: number }, reply: Reply) => void, original = vi.fn(async () => new Response('net'))) => {
  const w = { fetch: original, location: { href: 'thesarvo://site/g/', origin: 'thesarvo://site' } } as unknown as W
  w.webkit = { messageHandlers: { thesarvo: { postMessage: (m) => queueMicrotask(() => native(m as { id: number }, (id, status, body) => w.thesarvoBridge?.reply(id, status, body))) } } }
  return { w, original }
}

describe('app bridge', () => {
  it('does nothing in a browser', () => {
    const w = { fetch: vi.fn(), location: { href: 'https://x/', origin: 'https://x' } } as unknown as W
    expect(installBridge(w)).toBe(false)
    expect(w.thesarvoBridge).toBeUndefined()
  })

  it('sends our API calls to native and returns its answer', async () => {
    const sent: unknown[] = []
    const { w } = fakeWindow((m, reply) => {
      sent.push(m)
      reply(m.id, 409, '{"conflict":true}')
    })
    expect(installBridge(w)).toBe(true)
    const res = await w.fetch('/g/api/save?x=1', { method: 'POST', body: '{"a":1}', headers: { 'content-type': 'application/json' } })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ conflict: true })
    expect(sent[0]).toMatchObject({ type: 'api', method: 'POST', path: '/g/api/save?x=1', body: '{"a":1}', headers: { 'content-type': 'application/json' } })
  })

  it('rejects like a network failure when native says offline', async () => {
    const { w } = fakeWindow((m, reply) => reply(m.id, 0, ''))
    installBridge(w)
    await expect(w.fetch('/g/api/me')).rejects.toThrow('Offline')
  })

  it('leaves every other request alone', async () => {
    const { w, original } = fakeWindow(() => {
      throw new Error('not for native')
    })
    installBridge(w)
    await w.fetch('/g-data/manifest.json')
    await w.fetch('https://example.com/g/api/me')
    expect(original).toHaveBeenCalledTimes(2)
  })
})
