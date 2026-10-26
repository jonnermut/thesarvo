import ogImage from '#/brand/og-image.png'
import type { IndexNode } from '#/guide/content/types'
import { GUIDE_PREFIX, imageUrl } from '#/guide/content/paths'
import type { Guide } from '#/guide/model/types'
import { splitLines } from '#/guide/view/text'

/** Where the site is served, for the absolute addresses crawlers want. Set `VITE_SITE_URL` once there is a domain. */
const SITE_URL = (import.meta.env?.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '')

const LIMIT = 160

/** Plain text of at most `limit` characters, cut at a word and ended with an ellipsis when it was longer. */
export function excerpt(text: string, limit = LIMIT): string {
  const plain = text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
  if (plain.length <= limit) return plain
  const cut = plain.slice(0, limit - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > limit / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.-]+$/, '')}…`
}

/** What a search result says about a guide: its size and rock, then the first of its introduction, history or access. */
export function guideDescription(guide: Guide, node: Pick<IndexNode, 'title' | 'count'>): string {
  const header = guide.nodes.find((n) => n.type === 'header')
  const facts = [node.count ? `${node.count} ${guide.nodes.some((n) => n.type === 'problem') ? 'problems' : 'routes'}` : '', header?.rock ?? ''].filter(Boolean)
  const text = [header?.intro, header?.history, header?.access, header?.acknowledgement].map((t) => splitLines(t ?? '').join(' ')).find((t) => t.trim())
  const lead = `${node.title} climbing guide${facts.length ? `: ${facts.join(', ')}.` : '.'}`
  return excerpt(text ? `${lead} ${text}` : lead)
}

/** A contents or prose page: what is beneath it, or the start of its text. */
export function pageDescription(node: Pick<IndexNode, 'title' | 'count' | 'guides'>, body: string | null): string {
  const lead = `${node.title}: ${node.guides ? `${node.guides} guides, ` : ''}${node.count ? `${node.count} climbs` : 'climbing guides'}.`
  return excerpt(body?.trim() ? body : lead)
}

/** The first photo that carries a topo: a good picture to show when a link is shared. */
export function guideImage(guide: Guide): string | undefined {
  const topo = guide.nodes.find((n) => n.type === 'image')
  return topo ? imageUrl(guide.id, topo.src) : undefined
}

type Page = { title: string; description: string; path: string; image?: string }

/** Description, canonical address and Open Graph / Twitter card tags for one page. */
export function pageHead({ title, description, path, image }: Page) {
  const url = SITE_URL && `${SITE_URL}${path ? `${GUIDE_PREFIX}/${path}` : GUIDE_PREFIX}/`
  // Cards need an absolute picture; a relative one is only worth sending when we know the site's address.
  const given = image ?? ogImage
  const picture = /^https?:\/\//.test(given) ? given : SITE_URL && `${SITE_URL}${given}`
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:site_name', content: 'thesarvo' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      ...(url ? [{ property: 'og:url', content: url }] : []),
      ...(picture ? [{ property: 'og:image', content: picture }] : []),
      { name: 'twitter:card', content: picture ? 'summary_large_image' : 'summary' },
    ],
    links: url ? [{ rel: 'canonical', href: url }] : [],
  }
}
