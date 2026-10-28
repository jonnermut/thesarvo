import { getContentSource } from '.'
import { buildManifest } from './manifest'
import type { Manifest } from './manifest'
import { STATIC_SITE } from './paths'
import { staticSource } from './staticSource'

let manifest: Promise<Manifest> | undefined

/** Server and build only. Built once per process: reading every guide takes a moment. */
export function siteManifest(): Promise<Manifest> {
  manifest ??= (async () => {
    const source = STATIC_SITE ? staticSource() : getContentSource()
    return buildManifest(await source.getIndex(), (id) => source.getGuide(id))
  })()
  return manifest
}

/** Forget the manifest, so the next one sees pages added since (the dev server's, where an added page shows at once). */
export const resetSiteManifest = () => {
  manifest = undefined
}
