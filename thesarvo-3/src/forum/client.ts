import { call } from '#/auth/apiCall'
import type { Answer } from '#/auth/apiCall'
import { GUIDE_PREFIX } from '#/guide/content/paths'
import type { Notice, Thread, ThreadMeta } from './types'

export const listThreads = (): Promise<Answer<ThreadMeta[]>> => call('forum')
export const getThread = (id: string): Promise<Answer<Thread>> => call(`forum?thread=${encodeURIComponent(id)}`)
export const post = (body: Record<string, unknown>): Promise<Answer<Thread>> => call('forum', { method: 'POST', body: JSON.stringify(body) })

/** The home page feed: public, a few threads, cached by the CDN. Empty on any failure. */
export const recentThreads = (): Promise<ThreadMeta[]> =>
  fetch(`${GUIDE_PREFIX}/api/forum-recent`).then(
    (r) => (r.ok ? (r.json() as Promise<ThreadMeta[]>) : []),
    () => [],
  )

/** The home page's notices: public, cached by the CDN. Empty on any failure. */
export const notices = (): Promise<Notice[]> =>
  fetch(`${GUIDE_PREFIX}/api/forum-notices`).then(
    (r) => (r.ok ? (r.json() as Promise<Notice[]>) : []),
    () => [],
  )
