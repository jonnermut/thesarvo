import { presignedGet } from '#/aws/s3'
import { imageBucket } from '#/guide/content/bucketImages'
import { IMAGE_LINK_SECONDS } from '#/guide/content/privatePage'
import type { Thread } from './types'

const unescape = (s: string) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const IMAGE_TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' }
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

/** Makes an imported post's `data-file` names (see guide/content/pageBody) into links: photos show, other files download. A name `sign` has no link for is left as it is. */
export function linkFiles(html: string, sign: (name: string) => string | null): string {
  return html.replace(/<(img|a) data-file="([^"]*)"/g, (whole, tag: string, name: string) => {
    const url = sign(unescape(name))
    if (!url) return whole
    return tag === 'img' ? `<img src="${escape(url)}" loading="lazy"` : `<a href="${escape(url)}" target="_blank" rel="noopener"`
  })
}

/** A thread with signed links to the files its post and comments use, for members reading it. Links expire in an hour; the files are in `private/forum-images/<thread>/` and are never public. */
export function withFileLinks(t: Thread, env = process.env): Thread {
  const store = imageBucket(env)
  // Development has no bucket: its pictures are in `.saves/private/forum-images/`, which the dev server serves as files (a server route never sees image requests there); the address keeps the bucket's path, so `unlinkFiles` reads it.
  if (!store && env.NODE_ENV === 'production') return t
  const sign = (name: string) =>
    store
      ? presignedGet(store.bucket, store.creds, `private/forum-images/${t.id}/${name}`, IMAGE_LINK_SECONDS, new Date(), IMAGE_TYPES[name.split('.').pop()?.toLowerCase() ?? ''])
      : `/.saves/private/forum-images/${t.id}/${encodeURIComponent(name)}?dev=1`
  const fix = <T extends { html?: string }>(x: T): T => (x.html?.includes('data-file=') ? { ...x, html: linkFiles(x.html, sign) } : x)
  return { ...fix(t), comments: t.comments.map(fix) }
}

const FORUM_FILE = /<img([^>]*?) src="[^"]*\/private\/forum-images\/[^/"]+\/([^"?]+)\?[^"]*"(?: loading="[^"]*")?/g

/** The reverse of `withFileLinks` for text coming back from the editor: a picture shown through a signed link goes back to its file name, so a link that expires is never stored. */
export function unlinkFiles(html: string): string {
  return html.replace(FORUM_FILE, (_, rest: string, name: string) => {
    try {
      return `<img data-file="${escape(decodeURIComponent(name))}"${rest}`
    } catch {
      return _
    }
  })
}
