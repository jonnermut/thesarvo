import type { Guide } from '#/guide/model/types'
import type { HistoryEntry } from './history'

/** A guide as saved: the commit (or, in development, the version) it was read at, with its edit history. */
export type Stored = { head: string; guide: Guide; history: HistoryEntry[] }

export type Commit = { id: string; head: string; guide: Guide; history: HistoryEntry[]; message: { headline: string; body: string } }

/** Where saves go: the content repo on GitHub, or a local folder in development. */
export interface GuideRepo {
  read: (id: string) => Promise<Stored | null>
  /** Writes the guide and its history in one commit on top of `head`; null when someone saved since (`head` is stale). */
  commit: (c: Commit) => Promise<string | null>
}

export const guidePath = (id: string) => `pages/${id}/guide.json`
export const historyPath = (id: string) => `pages/${id}/history.json`

let repo: GuideRepo | null | undefined

/** Server-only. GitHub when `CONTENT_REPO` is set, a local folder on the dev server, else none: saving is not set up. */
export async function guideRepo(): Promise<GuideRepo | null> {
  repo ??= process.env.CONTENT_REPO
    ? new (await import('./github')).GitHubRepo(process.env.CONTENT_REPO, process.env.CONTENT_BRANCH ?? 'main')
    : process.env.NODE_ENV === 'development'
      ? (await import('./local')).localRepo()
      : null
  return repo
}
