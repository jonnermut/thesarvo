import { flatten, guideUrl, imageUrl, navTitle } from './paths'
import type { IndexNode } from './types'

const unescape = (s: string) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

/**
 * Makes a stored page body (see pageBody) ready to show: `data-page` links point at the pages they
 * name, or become plain text when there is no such page, and `data-file` names become URLs.
 */
/** The attachment names a stored page body uses. */
export const pageFiles = (html: string) => [...html.matchAll(/ data-file="([^"]*)"/g)].map((m) => unescape(m[1]))

export function resolvePageBody(html: string, root: IndexNode, pageId: string): string {
  const byTitle = new Map<string, IndexNode>()
  for (const n of flatten(root)) if (!byTitle.has(n.title.toLowerCase())) byTitle.set(n.title.toLowerCase(), n)
  return html
    .replace(/<a data-page="([^"]*)">([\s\S]*?)<\/a>/g, (_, title: string, text: string) => {
      const node = byTitle.get(navTitle(unescape(title)).toLowerCase())
      return node ? `<a href="${escape(guideUrl(node))}">${text}</a>` : text
    })
    .replace(/<(img|a) data-file="([^"]*)"/g, (_, tag: string, name: string) => {
      const url = escape(imageUrl(pageId, unescape(name)))
      return tag === 'img' ? `<img src="${url}" loading="lazy"` : `<a href="${url}"`
    })
}
