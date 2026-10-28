import { flatten, guideUrl } from './paths'
import type { IndexNode } from './types'

/** The page title in a Confluence address (`…/display/thesarvo/Apsley+Edge`): spaces were `+`, the rest percent-encoded. */
export function oldTitle(url: string): string | null {
  const m = /\/display\/[^/]+\/([^/?#]+)/.exec(url)
  if (!m) return null
  try {
    return decodeURIComponent(m[1].replace(/\+/g, ' '))
  } catch {
    return null
  }
}

/**
 * What the edge needs to send old addresses to the new site, as key/value pairs for the `thesarvo-redirects` store (scripts/edge/viewer-request.js):
 * `t:<space>/<title, lower case>` (`/confluence/display/…`) and `p:<id>` (`/confluence/pages/viewpage.action?pageId=…`) to the page's new address,
 * and `a:<id>` = 1 for guides, whose attachments (`/confluence/download/attachments/<id>/<name>`) are in `/images/<id>/`. `oldUrls` maps page ids to the
 * address Confluence used (the live index). Pages Confluence no longer lists are found by their id only.
 */
export function redirectEntries(index: IndexNode, oldUrls: ReadonlyMap<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const n of flatten(index)) {
    const to = `${n.path ? guideUrl(n) : '/g'}/`
    out[`p:${n.id}`] = to
    if (n.isGuide) out[`a:${n.id}`] = '1'
    const url = oldUrls.get(n.id)
    const title = url && oldTitle(url)
    if (url && title) out[`t:${/\/display\/([^/]+)\//.exec(url)?.[1].toLowerCase()}/${title.toLowerCase()}`] = to
  }
  return out
}
