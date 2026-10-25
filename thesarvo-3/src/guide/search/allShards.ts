import { getContentSource } from '#/guide/content'
import { flatten } from '#/guide/content/paths'
import { guideShard } from './shard'
import type { Shard } from './shard'

let shards: Promise<Shard[]> | undefined

/** Server only (development): every guide's shard, built once per process like the manifest. */
export function allShards(): Promise<Shard[]> {
  shards ??= (async () => {
    const source = getContentSource()
    const guides = await Promise.all(flatten(await source.getIndex()).filter((n) => n.isGuide).map((n) => source.getGuide(n.id)))
    return guides.flatMap((g) => (g ? [guideShard(g)] : []))
  })()
  return shards
}
