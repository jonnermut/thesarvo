import { cleanPageBody } from '#/guide/content/pageBody'
import type { Author, Comment, Thread } from './types'

/** A row of the Confluence export: a blog post (thread) or a comment on one. Dates are UTC, `2026-09-06 05:44:15`. */
export type PostRow = { id: string; title: string; creator: string | null; created: string; body: string; space: string }
export type CommentRow = { id: string; post: string; parent: string | null; creator: string | null; created: string; body: string }

/** Spaces whose posts only a group may read. */
export const PRIVATE_SPACES: Record<string, string> = { cct: 'cct-members' }

export const UNKNOWN: Author = { sub: 'confluence:unknown', name: 'Unknown' }
const iso = (utc: string) => `${utc.replace(' ', 'T').replace(/\.\d+$/, '')}Z`

/** A thread from its post and comments (in any order); empty comments are dropped, replies to a dropped one move up to its parent. */
export function toThread(post: PostRow, comments: CommentRow[], who: (key: string | null) => Author | undefined): Thread {
  const author = (key: string | null) => who(key) ?? UNKNOWN
  const bodies = new Map<string, string | null>(comments.map((c) => [c.id, cleanPageBody(c.body, '')]))
  const parentOf = new Map(comments.map((c) => [c.id, c.parent]))
  const live = (id: string | null): string | null => {
    for (let n = 0; id && n < 100; n++, id = parentOf.get(id) ?? null) if (bodies.get(id)) return id
    return null
  }
  const out: Comment[] = comments
    .toSorted((a, b) => a.created.localeCompare(b.created) || Number(a.id) - Number(b.id))
    .flatMap((c) => {
      const html = bodies.get(c.id)
      return html ? [{ id: c.id, parent: live(c.parent), author: author(c.creator), at: iso(c.created), html }] : []
    })
  const group = PRIVATE_SPACES[post.space]
  const html = cleanPageBody(post.body, post.title)
  return { id: post.id, title: post.title, author: author(post.creator), at: iso(post.created), ...(html && { html }), comments: out, ...(group && { group }) }
}
