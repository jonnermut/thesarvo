import { Window } from 'happy-dom'
import type { Element, Node } from 'happy-dom'

/**
 * Turns a Confluence page body (storage format) into the plain HTML stored as `pages/<id>/page.html`.
 * Build and sync time only. Macros the site replaces itself (contents, children, galleries) are
 * dropped; notes and columns become plain divs. Links to other pages are kept as
 * `<a data-page="Title">` and attachments as `data-file="name"`, both resolved when a page is rendered
 * (see pageLinks), so renaming a page never means re-syncing the pages that link to it.
 */
export function cleanPageBody(storage: string, title: string): string | null {
  const doc = new Window().document
  const source = doc.createElement('div')
  source.innerHTML = storage
    // Storage format is XML: give self-closing Confluence tags an end tag for the HTML parser...
    .replace(/<((?:ac|ri):[\w-]+)([^>]*?)\/>/g, '<$1$2></$1>')
    // ...and turn CDATA into text.
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;'))
  const out = doc.createElement('div')
  out.append(...clean(doc, source.childNodes))
  tidy(out, title)
  // A body that is only a heading over the contents macro has nothing to show.
  const probe = out.cloneNode(true)
  for (const h of probe.querySelectorAll('h1, h2, h3, h4, h5, h6')) h.remove()
  return probe.textContent.trim() || probe.querySelector('img') ? out.innerHTML.trim() : null
}

const KEEP = new Set(
  'p br h1 h2 h3 h4 h5 h6 ul ol li strong b em i u s a img table thead tbody tr td th blockquote pre code hr sub sup div'.split(' '),
)
const ATTRS: Record<string, string[]> = { a: ['href'], img: ['src', 'alt', 'width'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'] }
const NOTES = new Set(['info', 'note', 'tip', 'warning', 'panel'])
const SAFE_URL = /^(https?:|mailto:|#)/i

type Doc = Window['document']

function clean(doc: Doc, nodes: Iterable<Node>): Node[] {
  return [...nodes].flatMap((n) => convert(doc, n))
}

function convert(doc: Doc, node: Node): Node[] {
  if (node.nodeType === 3) return [doc.createTextNode(node.textContent ?? '')]
  if (node.nodeType !== 1) return []
  const el = node as Element
  const tag = el.tagName.toLowerCase()
  const child = (name: string) => [...el.children].find((c) => c.tagName.toLowerCase() === name)
  const inner = (from: Element | undefined = el) => (from ? clean(doc, from.childNodes) : [])
  const make = (name: string, attrs: Record<string, string>, content: Node[]) => {
    const e = doc.createElement(name)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    e.append(...content)
    return e
  }

  if (tag === 'ac:structured-macro') {
    const name = el.getAttribute('ac:name') ?? ''
    const body = child('ac:rich-text-body')
    if (NOTES.has(name)) {
      const heading = [...el.children].find((c) => c.tagName.toLowerCase() === 'ac:parameter' && c.getAttribute('ac:name') === 'title')?.textContent
      const titleNodes = heading ? [make('p', {}, [make('strong', {}, [doc.createTextNode(heading)])])] : []
      return [make('div', { class: name === 'warning' ? 'note warning' : 'note' }, [...titleNodes, ...inner(body)])]
    }
    if (name === 'section') return [make('div', { class: 'columns' }, inner(body))]
    if (name === 'column') return [make('div', {}, inner(body))]
    // Everything else is either replaced by the site (contents, children, galleries) or has no
    // meaning outside Confluence; keep the content of any that wrap some.
    return inner(body)
  }
  if (tag === 'ac:link' || tag === 'ac:image') {
    const page = child('ri:page')?.getAttribute('ri:content-title')
    const file = child('ri:attachment')?.getAttribute('ri:filename')
    const url = child('ri:url')?.getAttribute('ri:value')
    if (tag === 'ac:image') {
      const width = el.getAttribute('ac:width')
      const attrs = { ...(width && { width }), alt: '' }
      if (file) return [make('img', { 'data-file': file, ...attrs }, [])]
      return url && SAFE_URL.test(url) ? [make('img', { src: url, ...attrs }, [])] : []
    }
    const plain = child('ac:plain-text-link-body')?.textContent
    const body = child('ac:link-body') ? inner(child('ac:link-body')) : [doc.createTextNode(plain || page || file || url || '')]
    if (page) return [make('a', { 'data-page': page }, body)]
    if (file) return [make('a', { 'data-file': file }, body)]
    return url && SAFE_URL.test(url) ? [make('a', { href: url }, body)] : body
  }
  if (tag.includes(':') || tag === 'script' || tag === 'style') return []
  if (tag === 'a') {
    const href = el.getAttribute('href') ?? ''
    // Old wiki links: /confluence/display/<space>/<Title>
    const wiki = /\/display\/[^/]+\/([^/?#]+)$/.exec(href)?.[1]
    if (wiki) return [make('a', { 'data-page': decodeURIComponent(wiki.replace(/\+/g, ' ')) }, inner())]
    return SAFE_URL.test(href) ? [make('a', { href }, inner())] : inner()
  }
  if (!KEEP.has(tag)) return inner()
  const attrs: Record<string, string> = {}
  for (const name of ATTRS[tag] ?? []) {
    const value = el.getAttribute(name)
    if (value && (name !== 'src' || SAFE_URL.test(value))) attrs[name] = value
  }
  if (tag === 'img' && !attrs.src) return []
  return [make(tag, attrs, inner())]
}

const level = (e: Element | null) => (e && /^H(\d)$/.exec(e.tagName)?.[1]) || null

/**
 * Drops empty paragraphs and divs, headings left with nothing under them (their macro is gone),
 * and a leading heading that only repeats the page title.
 */
function tidy(root: Element, title: string) {
  for (const e of [...root.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6')].reverse()) {
    if (!e.textContent?.trim() && !e.querySelector('img')) e.remove()
  }
  for (const h of [...root.children].reverse()) {
    const next = level(h.nextElementSibling)
    if (level(h) && (!h.nextElementSibling || (next && next <= level(h)!))) h.remove()
  }
  const first = root.firstElementChild
  if (first && /^H\d$/.test(first.tagName) && first.textContent?.trim().toLowerCase() === title.toLowerCase()) first.remove()
  while (root.firstChild?.nodeType === 3 && !root.firstChild.textContent?.trim()) root.removeChild(root.firstChild)
}
