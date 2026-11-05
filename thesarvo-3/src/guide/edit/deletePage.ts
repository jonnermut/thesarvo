import { flatten } from '#/guide/content/paths'
import { fetchTree, refreshManifest } from '#/guide/server'
import { call } from './saver'
import type { Answer } from './saver'

/** Asks the server (admins only) to take a page and the pages under it out of the page tree; the ids removed. */
export const deletePage = (page: string): Promise<Answer<{ ids: string[] }>> => call('delete-page', { method: 'POST', body: JSON.stringify({ page }) })

const POLL_MS = 2000
const GIVE_UP_MS = 120_000

/** The pages leave the static site once the publish the commit started is done (about 20 seconds). Waits until the tree no longer has the page; false if it takes too long. */
export async function waitForGone(id: string, wait = (ms: number) => new Promise((r) => setTimeout(r, ms)), now = Date.now): Promise<boolean> {
  const until = now() + GIVE_UP_MS
  while (now() < until) {
    refreshManifest(false)
    const tree = await fetchTree().catch(() => null)
    if (tree && !flatten(tree).some((n) => n.id === id)) {
      refreshManifest()
      return true
    }
    await wait(POLL_MS)
  }
  return false
}
