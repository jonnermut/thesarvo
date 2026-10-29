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

/** Pages whose text became a section of the About page: old id, old title, the section. */
const FOLDED: [id: string, title: string, section: string][] = [
  ['407', 'Contact', 'contact'],
  ['406', 'Contribute', 'contributing'],
  ['8355855', 'Copyright', 'copyright'],
  ['398327814', 'thesarvo iOS and Android App Privacy Policy', 'privacy'],
]
const ABOUT = '296'

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
  const about = flatten(index).find((n) => n.id === ABOUT)
  if (about)
    for (const [id, title, section] of FOLDED) {
      const to = `${guideUrl(about)}/#${section}`
      out[`p:${id}`] = to
      out[`t:thesarvo/${title.toLowerCase()}`] = to
    }
  return out
}
