import { GUIDE_PREFIX } from '#/guide/content/paths'

/**
 * The page's side of the app bridge (specified in plan-mobile-ios.md section 4). In the iOS and Android apps the page is served from a custom
 * origin, so calls to our own API go through native `URLSession`, which adds the bearer token and answers `offline` (status 0)
 * when there is no network. In a browser there is no handler and nothing changes.
 */

type Handler = { postMessage: (message: unknown) => void }
type BridgeWindow = Window & typeof globalThis & { webkit?: { messageHandlers?: { thesarvo?: Handler } }; thesarvoHost?: { postMessage: (message: string) => void }; thesarvoBridge?: { reply: (id: number, status: number, body: string) => void }; thesarvoContents?: () => void; thesarvoMapPoints?: () => void; thesarvoAddPage?: () => void }

type Reply = { status: number; body: string }

/** The native handler: `webkit.messageHandlers.thesarvo` on iOS (structured messages), `thesarvoHost` on Android (JSON strings). */
function nativeHandler(win: BridgeWindow): Handler | undefined {
  const ios = win.webkit?.messageHandlers?.thesarvo
  if (ios) return ios
  const host = win.thesarvoHost
  return host ? { postMessage: (message) => host.postMessage(JSON.stringify(message)) } : undefined
}

/**
 * The app's start-up script keeps `data-app` (and the Appearance setting's `data-theme`) too, but a pack served before that build ships still needs it: a client-rendered page (a path that was not prerendered,
 * such as a members-only page seen signed out) replaces `<html>`, which brings the site's own header back under the app's bar and drops the chosen theme.
 * `data-app` is always put back; `data-theme` only onto a replaced `<html>`, so the page's own Auto/Light/Dark switch (which removes it for Auto) still works.
 */
function keepAppMode(win: BridgeWindow) {
  if (typeof win.MutationObserver !== 'function') return
  const doc = win.document
  const mode = doc.documentElement.dataset.app ?? 'app'
  let theme = doc.documentElement.dataset.theme
  let watched: Element | null = null
  const keep: MutationObserver = new win.MutationObserver(() => {
    const html = doc.documentElement
    if (html !== watched && theme && !html.dataset.theme) html.dataset.theme = theme
    if (html.dataset.app !== mode) html.dataset.app = mode
    theme = html.dataset.theme
    watch()
  })
  const watch = () => {
    if (doc.documentElement === watched) return
    watched = doc.documentElement
    keep.observe(watched, { attributes: true, attributeFilter: ['data-app', 'data-theme'] })
  }
  keep.observe(doc, { childList: true })
  watch()
}

/** Routes `fetch('/g/api/…')` through the native handler. Returns false when not running in the app. */
export function installBridge(win: BridgeWindow = window): boolean {
  const handler = nativeHandler(win)
  if (!handler || win.thesarvoBridge) return !!handler
  win.document.documentElement.dataset.app ??= 'app'
  keepAppMode(win)
  const pending = new Map<number, (r: Reply) => void>()
  let next = 1
  win.thesarvoBridge = { reply: (id, status, body) => pending.get(id)?.({ status, body }) }
  const original = win.fetch.bind(win)
  win.fetch = async (input, init) => {
    const here = new URL(win.location.href) // a custom scheme has an opaque `origin`, so compare scheme and host
    const url = new URL(input instanceof Request ? input.url : String(input), here)
    if (url.protocol !== here.protocol || url.host !== here.host || !url.pathname.startsWith(`${GUIDE_PREFIX}/api/`)) return original(input, init)
    const headers: Record<string, string> = {}
    new Headers(init?.headers).forEach((v, k) => (headers[k] = v))
    const id = next++
    const reply = new Promise<Reply>((resolve) => pending.set(id, resolve))
    handler.postMessage({ type: 'api', id, method: init?.method ?? 'GET', path: url.pathname + url.search, headers, body: typeof init?.body === 'string' ? init.body : undefined })
    const r = await reply
    pending.delete(id)
    if (r.status === 0) throw new TypeError('Offline') // callers treat a thrown fetch as offline
    return new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json' } })
  }
  return true
}

/** True inside the app's web view (set by the app's start-up script). */
export const inApp = (win: BridgeWindow = window) => !!nativeHandler(win)

/** A guide's GPS point for the native map. */
export type MapPoint = { title: string; lat: number; lon: number }

/** One line of a guide's contents, for the app's native Contents sheet. */
export type ContentsLine = { anchor: string; kind: string; level: number; text: string; number?: string; grade?: string; stars?: string }

/** Asks the app to show the guide's contents natively (the app scrolls the page to the chosen anchor). Returns false in a browser. */
export function openNativeContents(title: string, entries: ContentsLine[], win: BridgeWindow = window): boolean {
  const handler = nativeHandler(win)
  handler?.postMessage({ type: 'openContents', title, entries })
  return !!handler
}

/**
 * Tells the app whether the page has a contents list, so it can show its own Contents button in the top bar, and lets the app ask
 * for the list (`window.thesarvoContents()`, which the page answers with `openContents`). Returns a function that undoes both.
 */
export function offerContents(open: () => void, win: BridgeWindow = window): () => void {
  const handler = nativeHandler(win)
  if (!handler) return () => {}
  win.thesarvoContents = open
  handler.postMessage({ type: 'contentsAvailable', available: true })
  return () => {
    if (win.thesarvoContents === open) delete win.thesarvoContents
    handler.postMessage({ type: 'contentsAvailable', available: false })
  }
}

/** Tells the app the page on screen is a prose page the rich text editor can open, so its page menu offers "Edit this page" (guides it already knows). Returns a function that undoes it. */
export function offerPageEdit(win: BridgeWindow = window): () => void {
  const handler = nativeHandler(win)
  if (!handler) return () => {}
  handler.postMessage({ type: 'pageEditable', available: true })
  return () => handler.postMessage({ type: 'pageEditable', available: false })
}

/** Lets the app's menu open the page's Add a page dialog (`window.thesarvoAddPage()`). Returns a function that undoes it. */
export function offerAddPage(open: () => void, win: BridgeWindow = window): () => void {
  if (!nativeHandler(win)) return () => {}
  win.thesarvoAddPage = open
  return () => {
    if (win.thesarvoAddPage === open) delete win.thesarvoAddPage
  }
}

/** Lets the app ask the page for its GPS points when the reader switches to the Map tab (the page answers with `openMap`). Returns a function that undoes it. */
export function offerMapPoints(open: () => void, win: BridgeWindow = window): () => void {
  if (!nativeHandler(win)) return () => {}
  win.thesarvoMapPoints = open
  return () => {
    if (win.thesarvoMapPoints === open) delete win.thesarvoMapPoints
  }
}

/** Hands a generated file (GPX, KML) to the app's share sheet: the web view cannot save downloads. Returns false in a browser. */
export function shareFileNative(name: string, type: string, text: string, win: BridgeWindow = window): boolean {
  const handler = nativeHandler(win)
  handler?.postMessage({ type: 'shareFile', name, mime: type, text })
  return !!handler
}

/** Asks the app to show a guide's points on its native map tab. Returns false in a browser. */
export function openNativeMap(guideId: string, points: MapPoint[] = [], win: BridgeWindow = window): boolean {
  const handler = nativeHandler(win)
  handler?.postMessage({ type: 'openMap', guide: guideId, points })
  return !!handler
}
