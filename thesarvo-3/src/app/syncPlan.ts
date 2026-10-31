import type { AppManifest, Category, Variant } from './manifest'

/** Which image variants to fetch: `true` for every guide, a list of guide ids for those guides, `false` for none. */
export type Policy = { s: boolean | string[]; m: boolean | string[]; l: boolean | string[] }

export type Download = { hash: string; path: string; size: number; kind: Category | Variant }

const ORDER: (Category | Variant)[] = ['shell', 'data', 'html', 's', 'm', 'l']

const wants = (p: boolean | string[], guide: string) => p === true || (Array.isArray(p) && p.includes(guide))

/** Everything the policy wants from the manifest, with the URL path to fetch it from (hash-named for images). */
export function wanted(manifest: AppManifest, policy: Policy): Download[] {
  const out: Download[] = manifest.files.map((f) => ({ hash: f.h, path: f.p, size: f.z, kind: f.c }))
  for (const im of manifest.images) {
    for (const v of ['s', 'm', 'l'] as const) {
      const e = im[v]
      if (e && wants(policy[v], im.g)) out.push({ hash: e[0], path: `images-app/${e[0]}`, size: e[1], kind: v })
    }
  }
  return out
}

/** The downloads still needed (one per hash, in priority order) and the stored hashes the manifest no longer lists at all. */
export function diff(manifest: AppManifest, present: string[], policy: Policy): { downloads: Download[]; deletions: string[] } {
  const have = new Set(present)
  const seen = new Set<string>()
  const downloads: Download[] = []
  for (const d of wanted(manifest, policy)) {
    if (have.has(d.hash) || seen.has(d.hash)) continue
    seen.add(d.hash)
    downloads.push(d)
  }
  downloads.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))
  const listed = new Set(wanted(manifest, { s: true, m: true, l: true }).map((d) => d.hash))
  return { downloads, deletions: present.filter((h) => !listed.has(h)).sort() }
}

/** The generation's path index: path -> hash for the files, `<guide>/<name>` -> variant hashes for the images that are present. */
export function generation(manifest: AppManifest, present: string[]) {
  const have = new Set(present)
  const paths: Record<string, string> = {}
  for (const f of manifest.files) if (have.has(f.h)) paths[`/${f.p}`] = f.h
  const images: Record<string, { s?: string; m?: string; l?: string; x: string }> = {}
  for (const im of manifest.images) {
    const e: { s?: string; m?: string; l?: string; x: string } = { x: im.x }
    for (const v of ['s', 'm', 'l'] as const) {
      const h = im[v]?.[0]
      if (h && have.has(h)) e[v] = h
    }
    if (e.s || e.m || e.l) images[`${im.g}/${im.n}`] = e
  }
  return { paths, images }
}

/** True when every text file (shell, data, html) is present, so the generation may switch. */
export const textComplete = (manifest: AppManifest, present: string[]) => {
  const have = new Set(present)
  return manifest.files.every((f) => have.has(f.h))
}
