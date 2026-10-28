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
  if (!store) return t
  const sign = (name: string) => presignedGet(store.bucket, store.creds, `private/forum-images/${t.id}/${name}`, IMAGE_LINK_SECONDS, new Date(), IMAGE_TYPES[name.split('.').pop()?.toLowerCase() ?? ''])
  const fix = <T extends { html?: string }>(x: T): T => (x.html?.includes('data-file=') ? { ...x, html: linkFiles(x.html, sign) } : x)
  return { ...fix(t), comments: t.comments.map(fix) }
}
