import { flatten } from '#/guide/content/paths'
import { fetchGuide, fetchTree, refreshManifest } from '#/guide/server'
import { call } from './saver'
import type { Answer } from './saver'

export type PageKind = 'guide' | 'html'

/** Asks the server to add a page under `parent`; its id. */
export const createPage = (parent: string, title: string, kind: PageKind): Promise<Answer<{ id: string }>> =>
  call('create-page', { method: 'POST', body: JSON.stringify({ parent, title, kind }) })

const POLL_MS = 2000
const GIVE_UP_MS = 120_000

/**
 * The new page is in the static site once the publish its commit started is done (about 20 seconds). Waits for that,
 * until the tree and the guide are both there: its path, or null if it takes too long.
 */
export async function waitForPage(id: string, wait = (ms: number) => new Promise((r) => setTimeout(r, ms)), now = Date.now): Promise<string | null> {
  const until = now() + GIVE_UP_MS
  while (now() < until) {
    refreshManifest(false)
    const tree = await fetchTree().catch(() => null)
    const node = tree && flatten(tree).find((n) => n.id === id)
    if (node && (await fetchGuide({ data: id }).catch(() => null))) {
      refreshManifest()
      return node.path
    }
    await wait(POLL_MS)
  }
  return null
}
