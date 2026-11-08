import type { StoredIndexNode } from '#/guide/content/syncFeed'
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

/** What adding or deleting a page needs on top of saving guides. */
export interface PageRepo {
  /** The page tree as stored, and the commit it was read at. */
  readIndex: () => Promise<{ head: string; index: StoredIndexNode }>
  /** Writes the new tree, a new page's content (a guide, or the HTML of a prose page) and its history in one commit on top of `head`; null when someone saved since. */
  commitPage: (c: { head: string; index: StoredIndexNode; id: string; content: { guide: Guide } | { html: string }; history: HistoryEntry[]; message: Commit['message'] }) => Promise<string | null>
  /** Writes the changed tree alone (a page taken out) in one commit on top of `head`; null when someone saved since. */
  commitIndex: (c: { head: string; index: StoredIndexNode; message: Commit['message'] }) => Promise<string | null>
}

/** A prose page's HTML as saved, with the commit it was read at and its edit history. */
export type StoredBody = { head: string; html: string; history: HistoryEntry[] }

/** What saving a prose page (`pages/<id>/page.html`) needs. */
export interface BodyRepo {
  readBody: (id: string) => Promise<StoredBody | null>
  /** Writes the HTML and the history in one commit on top of `head`; null when someone saved since. */
  commitBody: (c: { id: string; head: string; html: string; history: HistoryEntry[]; message: Commit['message'] }) => Promise<string | null>
}

export const indexPath = 'index.json'
export const guidePath = (id: string) => `pages/${id}/guide.json`
export const bodyPath = (id: string) => `pages/${id}/page.html`
export const historyPath = (id: string) => `pages/${id}/history.json`

let repo: (GuideRepo & PageRepo & BodyRepo) | null | undefined

/** Server-only. GitHub when `CONTENT_REPO` is set, a local folder on the dev server, else none: saving is not set up. */
export async function guideRepo(): Promise<(GuideRepo & PageRepo & BodyRepo) | null> {
  repo ??= process.env.CONTENT_REPO
    ? new (await import('./github')).GitHubRepo(process.env.CONTENT_REPO, process.env.CONTENT_BRANCH ?? 'main')
    : process.env.NODE_ENV === 'development'
      ? (await import('./local')).localRepo()
      : null
  return repo
}
