/** The app pack manifest (`app/v1/manifest.json`): every file the apps keep on the device, by path and content hash. */

export type Category = 'shell' | 'data' | 'html'
export type Variant = 's' | 'm' | 'l'

/** A site file: `p` is its URL path (no leading slash), `h` the SHA-256 of its bytes (hex), `z` its size, `c` its category. */
export type AppFile = { p: string; h: string; z: number; c: Category }

/** A page image: `g` the guide (page id), `n` the file name, `x` the variant file type, and each variant's `[hash, size]` (downloaded from `images-app/<hash>`). */
export type AppImage = { g: string; n: string; x: 'jpg' | 'png'; s?: [string, number]; m?: [string, number]; l?: [string, number] }

export type AppManifest = {
  schema: 1
  contentCommit: string
  builtAt: string
  /** The oldest native shell that may run this pack. */
  minShell: number
  /** The bridge version the pack's JavaScript needs. */
  bridge: number
  files: AppFile[]
  images: AppImage[]
}

/** Not shipped to the apps: online-only data (history), build bookkeeping, and files only crawlers read. */
const EXCLUDED = [/^g-data\/history\//, /^g-data\/build\.json$/, /^deploy\.json$/, /^robots\.txt$/, /^sitemap.*\.xml$/]

export function categoryOf(path: string): Category | null {
  if (EXCLUDED.some((r) => r.test(path))) return null
  if (path.startsWith('g-data/')) return 'data'
  if (path.startsWith('assets/') || path === 'favicon.svg' || path === 'index.html') return 'shell'
  if (path.endsWith('.html')) return 'html'
  return 'shell'
}

export function buildAppManifest(files: { path: string; hash: string; size: number }[], images: AppImage[], meta: { contentCommit: string; builtAt: string }): AppManifest {
  const out: AppFile[] = []
  for (const f of [...files].sort((a, b) => (a.path < b.path ? -1 : 1))) {
    const c = categoryOf(f.path)
    if (c) out.push({ p: f.path, h: f.hash, z: f.size, c })
  }
  const sorted = [...images].sort((a, b) => (a.g + '/' + a.n < b.g + '/' + b.n ? -1 : 1))
  return { schema: 1, ...meta, minShell: 1, bridge: 1, files: out, images: sorted }
}
