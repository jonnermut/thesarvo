import { fetchSearchShards, fetchTree } from '#/guide/server'
import { buildSearchIndex } from './match'
import type { SearchIndex } from './match'

let index: Promise<SearchIndex> | undefined

/** Browser only: the search index, loaded once per visit when search is first used. */
export function loadSearchIndex(): Promise<SearchIndex> {
  index ??= Promise.all([fetchTree(), fetchSearchShards()])
    .then(([tree, shards]) => buildSearchIndex(tree, shards))
    .catch((e: unknown) => {
      index = undefined
      throw e
    })
  return index
}
