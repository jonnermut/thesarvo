import { call } from '#/auth/apiCall'
import type { Answer } from '#/auth/apiCall'
import { GUIDE_PREFIX, STATIC_SITE } from '#/guide/content/paths'
import type { Notice, Thread, ThreadMeta } from './types'

export const listThreads = (): Promise<Answer<ThreadMeta[]>> => call('forum')
export const getThread = (id: string): Promise<Answer<Thread>> => call(`forum?thread=${encodeURIComponent(id)}`)
export const post = (body: Record<string, unknown>): Promise<Answer<Thread>> => call('forum', { method: 'POST', body: JSON.stringify(body) })

/** Public home feeds: static files the Lambda rewrites when a post changes (`publishFeeds`), so a home page view never runs it. In development, where nothing writes them, the API answers. Empty on any failure. */
const feed = <T>(name: string, api: string): Promise<T[]> =>
  fetch(STATIC_SITE ? `${GUIDE_PREFIX}-data/${name}` : `${GUIDE_PREFIX}/api/${api}`, { cache: 'no-cache' }).then(
    (r) => (r.ok ? (r.json() as Promise<T[]>) : []),
    () => [],
  )

/** The home page feed: a few threads, titles and counts only. */
export const recentThreads = (): Promise<ThreadMeta[]> => feed<ThreadMeta>('forum-recent.json', 'forum-recent')

/** The home page's notices; the file holds them until replaced, so the ones that have run out are dropped here. */
export const notices = async (): Promise<Notice[]> => (await feed<Notice>('forum-notices.json', 'forum-notices')).filter((n) => n.until > new Date().toISOString())
