import { describe, expect, it, vi } from 'vitest'
import { inApp, installBridge, offerContents, offerMapPoints, openNativeMap, shareFileNative } from './bridge'

type W = NonNullable<Parameters<typeof installBridge>[0]>
type Reply = (id: number, status: number, body: string) => void
/** A window whose native handler is `native(message, reply)`. */
const fakeWindow = (native: (m: { id: number }, reply: Reply) => void, original = vi.fn(async () => new Response('net'))) => {
  const w = { fetch: original, location: { href: 'thesarvo://site/g/', origin: 'thesarvo://site' }, document: { documentElement: { dataset: {} as Record<string, string> } } } as unknown as W
  w.webkit = { messageHandlers: { thesarvo: { postMessage: (m) => queueMicrotask(() => native(m as { id: number }, (id, status, body) => w.thesarvoBridge?.reply(id, status, body))) } } }
  return { w, original }
}

describe('app bridge on Android', () => {
  it('posts JSON strings through thesarvoHost and takes replies', async () => {
    const sent: string[] = []
    const w = { fetch: vi.fn(), location: { href: 'https://app.thesarvo.invalid/g/' }, document: { documentElement: { dataset: { app: 'android' } as Record<string, string> } } } as unknown as W
    w.thesarvoHost = { postMessage: (m) => { sent.push(m); const o = JSON.parse(m) as { type: string; id: number }; if (o.type === 'api') queueMicrotask(() => w.thesarvoBridge?.reply(o.id, 200, '{"ok":true}')) } }
    expect(inApp(w)).toBe(true)
    expect(installBridge(w)).toBe(true)
    expect(w.document.documentElement.dataset.app).toBe('android')
    const res = await w.fetch('/g/api/me')
    expect(await res.json()).toEqual({ ok: true })
    expect(openNativeMap('g1', [], w)).toBe(true)
    expect(JSON.parse(sent[1])).toEqual({ type: 'openMap', guide: 'g1', points: [] })
  })
})

describe('app bridge', () => {
  it('does nothing in a browser', () => {
    const w = { fetch: vi.fn(), location: { href: 'https://x/', origin: 'https://x' } } as unknown as W
    expect(installBridge(w)).toBe(false)
    expect(w.thesarvoBridge).toBeUndefined()
  })

  it('marks the page as app mode so the site chrome hides (styles.css)', () => {
    const { w } = fakeWindow(() => {})
    installBridge(w)
    expect(w.document.documentElement.dataset.app).toBe('app')
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

  it('asks the app to open its map for a guide', () => {
    const sent: unknown[] = []
    const { w } = fakeWindow((m) => sent.push(m))
    expect(inApp(w)).toBe(true)
    expect(openNativeMap('g1', [{ title: 'Car park', lat: -42.9, lon: 147.2 }], w)).toBe(true)
    return Promise.resolve().then(() => expect(sent).toEqual([{ type: 'openMap', guide: 'g1', points: [{ title: 'Car park', lat: -42.9, lon: 147.2 }] }]))
  })

  it('has no native map in a browser', () => {
    const w = { location: { href: 'https://x/' } } as unknown as W
    expect(inApp(w)).toBe(false)
    expect(openNativeMap('g1', [], w)).toBe(false)
  })

  it('hands a generated file to the share sheet, and does nothing in a browser', () => {
    const sent: unknown[] = []
    const { w } = fakeWindow((m) => sent.push(m))
    expect(shareFileNative('Eldon.gpx', 'application/gpx+xml', '<gpx/>', w)).toBe(true)
    expect(shareFileNative('x.gpx', 'application/gpx+xml', '', { location: { href: 'https://x/' } } as unknown as W)).toBe(false)
    return Promise.resolve().then(() => expect(sent).toEqual([{ type: 'shareFile', name: 'Eldon.gpx', mime: 'application/gpx+xml', text: '<gpx/>' }]))
  })

  it('offers the contents to the app and withdraws them', () => {
    const sent: unknown[] = []
    const { w } = fakeWindow((m) => sent.push(m))
    const open = () => {}
    const off = offerContents(open, w)
    expect(w.thesarvoContents).toBe(open)
    off()
    expect(w.thesarvoContents).toBeUndefined()
    expect(offerContents(open, { location: { href: 'https://x/' } } as unknown as W)()).toBeUndefined()
    return Promise.resolve().then(() => expect(sent).toEqual([{ type: 'contentsAvailable', available: true }, { type: 'contentsAvailable', available: false }]))
  })

  it('lets the app ask for the map points, and withdraws them', () => {
    const { w } = fakeWindow(() => {})
    const open = () => {}
    const off = offerMapPoints(open, w)
    expect(w.thesarvoMapPoints).toBe(open)
    off()
    expect(w.thesarvoMapPoints).toBeUndefined()
    expect(offerMapPoints(open, { location: { href: 'https://x/' } } as unknown as W)()).toBeUndefined()
  })
})
