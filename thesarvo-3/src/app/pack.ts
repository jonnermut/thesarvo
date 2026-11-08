/** What the publisher needs to keep the app pack current without rebuilding it: which deployed files the pack lists, and which photos still need their small versions. */
import type { AppImage } from './manifest'

/** Where the site's files live in the bucket (the same prefixes `scripts/deploy-changed.ts` owns). */
export const SITE_PREFIXES = ['assets/', 'g/', 'g-data/', 'auth/', 'account/', 'index.html', 'favicon.svg']

export type Listed = { key: string; etag: string }

/** The apps' sizes: the longest side in pixels and the JPEG quality of each variant. */
export const WIDTH = { s: 480, m: 1200, l: 2400 } as const
export const QUALITY = { s: 68, m: 72, l: 74 } as const

/** A file the pack has hashed: its MD5 (the S3 ETag it was hashed from), SHA-256 and size. */
export type FileState = Record<string, { m: string; h: string; z: number }>

/**
 * The deployed files that belong in the pack. The bucket also keeps old bundles and search files (so pages built earlier keep
 * working) and data of pages that are gone: the apps get only the current bundles, the current search files and the data of pages in the tree.
 */
export function currentFiles(remote: Listed[], now: { assets: Set<string>; search: Set<string>; nodes: Set<string> }): Listed[] {
  return remote.filter(({ key }) => {
    if (key.startsWith('assets/')) return now.assets.has(key)
    if (key.startsWith('g-data/search/')) return now.search.has(key)
    if (key.startsWith('g-data/forum-')) return false // the home feeds change with every post and are not offline content
    const own = /^g-data\/(?:guide|page|images|kml|history)\/([^/.]+)\./.exec(key)
    return own ? now.nodes.has(own[1]) : true
  })
}

/** A photo in the bucket (`images/<guide>/<name>`) with the ETag of its bytes. */
export type Original = { g: string; n: string; etag: string }

/** A photo's entry in the images index: the app's `AppImage` plus the ETag of the original it was made from (`o`). */
export type ImageEntry = AppImage & { o: string }

const same = (e: ImageEntry, o: Original) => e.g === o.g && e.n === o.n && e.o === o.etag

/** Photos with no entry yet, or whose original changed since. */
export function imagesToMake(originals: Original[], index: ImageEntry[]): Original[] {
  const have = new Set(index.map((e) => `${e.g}/${e.n}/${e.o}`))
  return originals.filter((o) => !have.has(`${o.g}/${o.n}/${o.etag}`))
}

/** Entries still wanted: the photo is still in a guide and unchanged. */
export function keptImages(originals: Original[], index: ImageEntry[]): ImageEntry[] {
  const now = new Map(originals.map((o) => [`${o.g}/${o.n}`, o]))
  return index.filter((e) => {
    const o = now.get(`${e.g}/${e.n}`)
    return !!o && same(e, o)
  })
}

/** Small enough and already a web format of the right type: the original is the variant, no re-encoding. */
export const keepOriginal = (file: string, width: number, v: keyof typeof WIDTH, x: 'jpg' | 'png') =>
  width <= WIDTH[v] && /\.(jpe?g|png)$/i.test(file) && x === (/\.png$/i.test(file) ? 'png' : 'jpg')

/** The bucket key of a photo's variant (named by its hash, so it never changes and caches for good). */
export const variantKey = (hash: string) => `images-app/${hash}`
