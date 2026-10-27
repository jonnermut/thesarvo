/** What a site deploy does with each file: the same rules as the `aws s3 sync` calls in scripts/deploy-site.sh, minus uploading what is already there. */
import { createHash } from 'node:crypto'

export type LocalFile = { key: string; md5: string }
export type RemoteFile = { key: string; etag: string }
export type Plan = { upload: string[]; remove: string[] }

export const md5 = (body: Buffer) => createHash('md5').update(body).digest('hex')

const TYPES: Record<string, string> = {
  html: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  json: 'application/json',
  kml: 'application/vnd.google-earth.kml+xml',
  svg: 'image/svg+xml',
  png: 'image/png',
  ico: 'image/x-icon',
  txt: 'text/plain',
  xml: 'application/xml',
  woff2: 'font/woff2',
}

export const contentType = (key: string) => (TYPES[key.slice(key.lastIndexOf('.') + 1)] ?? 'application/octet-stream') + (/\.(html|css|js|json|kml|txt|xml)$/.test(key) ? '; charset=utf-8' : '')

/** Hashed bundles and search files never change under one name, so they cache for a year; pages and data are checked every time. */
export const cacheControl = (key: string) => (key.startsWith('assets/') || key.startsWith('g-data/search/') ? 'public, max-age=31536000, immutable' : 'no-cache')

/** Old bundles and search files are kept so pages built earlier keep working. */
const kept = (key: string) => key.startsWith('assets/') || key.startsWith('g-data/search/')

/**
 * What to upload (new or different) and what to remove. A full build removes what the build no longer has
 * (except the kept prefixes); an incremental one only removes the pages it names.
 */
export function plan(local: LocalFile[], remote: RemoteFile[], removed: string[] | null): Plan {
  const etags = new Map(remote.map((r) => [r.key, r.etag]))
  const have = new Set(local.map((f) => f.key))
  return {
    upload: local.filter((f) => etags.get(f.key) !== f.md5).map((f) => f.key),
    remove: removed ? removed.filter((k) => etags.has(k)) : remote.map((r) => r.key).filter((k) => !have.has(k) && !kept(k)),
  }
}
