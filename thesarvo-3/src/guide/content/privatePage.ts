import { presignedGet } from '#/aws/s3'
import { bucketImageNames, imageBucket } from './bucketImages'
import type { Guide } from '#/guide/model/types'
import type { HistoryEntry } from '#/guide/save/history'
import type { GuideRepo } from '#/guide/save/repo'
import type { ContentSource } from './types'

/** A private page as the private API sends it: the guide or body, its edit history and signed links to its photos by name. */
export type PrivatePage = { guide: Guide | null; body: string | null; history: HistoryEntry[]; images: Record<string, string> }

/** Signed photo links last this long: well past a reading session, short enough that a copied link soon stops working. */
export const IMAGE_LINK_SECONDS = 3600

/** The page from the repo when saving is set up (so it is as fresh as the last save), else from the content that is packed with the server. */
export async function loadPrivatePage(all: ContentSource, repo: GuideRepo | null, id: string, isGuide: boolean, signed: (id: string) => Promise<Record<string, string>>): Promise<PrivatePage> {
  if (!isGuide) return { guide: null, body: await all.getPageBody(id), history: [], images: {} }
  const stored = await repo?.read(id)
  const guide = stored?.guide ?? (await all.getGuide(id))
  return { guide, body: null, history: stored?.history ?? (await all.getHistory(id)), images: await signed(id) }
}

/** Signed links to every photo in `private/images/<id>/`; none in development, where the folder source serves them. */
export async function signedPhotos(id: string, env = process.env): Promise<Record<string, string>> {
  const store = imageBucket(env)
  if (!store) return {}
  const names = await bucketImageNames(store.bucket, store.creds, id, true)
  return Object.fromEntries(names.map((n) => [n, presignedGet(store.bucket, store.creds, `private/images/${id}/${n}`, IMAGE_LINK_SECONDS)]))
}
