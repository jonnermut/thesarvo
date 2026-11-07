import { Window } from 'happy-dom'
import type { Element, Node } from 'happy-dom'
import { isEmbedSrc } from './embed'

/**
 * The allow-list every saved rich text passes through on the server (pages, forum posts and comments), whatever the editor sent:
 * only these tags and attributes survive, links and images only to safe addresses, and iframes only for the known video players.
 * Server only (happy-dom); the editor's own schema already keeps to the same set.
 */
const KEEP = new Set('p br h1 h2 h3 h4 h5 h6 ul ol li strong em u s a img blockquote pre code hr sub sup table thead tbody tr td th div iframe'.split(' '))
/** In this order in the output: forum pictures are found by `<img data-file=` (see forum/files.ts). */
const ATTRS: Record<string, string[]> = {
  a: ['data-file', 'data-page', 'href'],
  img: ['data-file', 'src', 'alt', 'width'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
  iframe: ['src', 'title', 'allowfullscreen'],
}
/** The classes the site styles (see `.page-prose`): notes, columns and the frame around an embedded video. */
const CLASSES = new Set(['note', 'note warning', 'columns', 'embed'])
const LINK = /^(?:https?:|mailto:|#|\/(?!\/))/i
const IMAGE = /^(?:https:\/\/|\/(?!\/))/i
/** Dropped with everything inside them, where unknown tags only lose the tag. */
const DROP = new Set(['script', 'style', 'noscript', 'template', 'object', 'embed', 'form', 'svg', 'math'])

type Doc = Window['document']

export const MAX_HTML = 200_000

/** The allow-listed HTML for `html`, or '' when nothing is left of it. */
export function sanitizeHtml(html: string): string {
  const doc = new Window().document
  const root = doc.createElement('div')
  root.innerHTML = html.slice(0, MAX_HTML * 2)
  const out = doc.createElement('div')
  out.append(...clean(doc, root.childNodes, false))
  tidy(out)
  return out.innerHTML.trim()
}

/** Whether there is any text, picture or video in the HTML (an editor that was emptied still holds `<p></p>`). */
export function hasContent(html: string): boolean {
  const doc = new Window().document
  const root = doc.createElement('div')
  root.innerHTML = html
  return !!(root.textContent?.trim() || root.querySelector('img, iframe, hr'))
}

function clean(doc: Doc, nodes: Iterable<Node>, inEmbed: boolean): Node[] {
  return [...nodes].flatMap((n) => convert(doc, n, inEmbed))
}

function convert(doc: Doc, node: Node, inEmbed: boolean): Node[] {
  if (node.nodeType === 3) return [doc.createTextNode(node.textContent ?? '')]
  if (node.nodeType !== 1) return []
  const el = node as Element
  const tag = el.tagName.toLowerCase()
  if (DROP.has(tag)) return []
  const inner = (embed = inEmbed) => clean(doc, el.childNodes, embed)
  if (!KEEP.has(tag)) return inner()
  const attrs: Record<string, string> = {}
  for (const name of ATTRS[tag] ?? []) {
    const value = el.getAttribute(name)
    if (value === null) continue
    if (name === 'href' && !LINK.test(value)) continue
    if (name === 'src' && tag === 'img' && !IMAGE.test(value)) continue
    if (name === 'width' && !/^\d{1,4}$/.test(value)) continue
    if ((name === 'colspan' || name === 'rowspan') && !/^\d{1,2}$/.test(value)) continue
    attrs[name] = value.slice(0, 2000)
  }
  if (tag === 'div') {
    const cls = (el.getAttribute('class') ?? '').trim().replace(/\s+/g, ' ')
    if (CLASSES.has(cls)) attrs.class = cls
  }
  if (tag === 'iframe') {
    // Only a player inside the frame the editor makes; the frame is the one place an iframe may go.
    if (!inEmbed || !isEmbedSrc(attrs.src ?? '')) return []
    attrs.allowfullscreen = ''
    attrs.title ||= 'Video'
    attrs.loading = 'lazy'
    attrs.referrerpolicy = 'strict-origin-when-cross-origin'
  }
  if (tag === 'a') {
    if (!attrs.href && !attrs['data-page'] && !attrs['data-file']) return inner()
    if (attrs.href && /^https?:/i.test(attrs.href)) attrs.rel = 'noopener noreferrer nofollow'
  }
  if (tag === 'img' && !attrs.src && !attrs['data-file']) return []
  const e = doc.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
  e.append(...inner(inEmbed || attrs.class === 'embed'))
  return [e]
}

/** An embed frame with no player left in it, and empty trailing paragraphs, go. */
function tidy(root: Element) {
  for (const e of [...root.querySelectorAll('div.embed')]) if (!e.querySelector('iframe')) e.remove()
  for (let last = root.lastElementChild; last && last.tagName === 'P' && !last.textContent?.trim() && !last.querySelector('img'); last = root.lastElementChild) last.remove()
}
