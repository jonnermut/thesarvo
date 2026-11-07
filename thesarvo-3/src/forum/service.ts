import { newId } from './ids'
import { hasContent, sanitizeHtml } from '#/rte/sanitize'
import { unlinkFiles } from './files'
import { metaOf, noticeOf } from './types'
import type { Author, Comment, Notice, Thread, ThreadMeta } from './types'
import type { ForumStore } from './store'

export const TITLE_MAX = 120
export const TEXT_MAX = 10_000
/** What the rich text box may send: HTML is longer than the words in it. */
export const HTML_MAX = 60_000
export const RECENT_COUNT = 8
/** A notice lasts at most this long. */
export const NOTICE_MAX_DAYS = 366
const RETRIES = 6

/** Who is asking: `groups` decide which restricted threads they see; `admin` may hide things. */
export type Viewer = Author & { groups: readonly string[]; admin: boolean }

const authorOf = (v: Viewer): Author => ({ sub: v.sub, name: v.name, ...(v.key && { key: v.key }) })

export class Refused extends Error {}

/** Imported posts (authors `confluence:<name>`) are Confluence's HTML and are never edited here. */
const isOwn = (v: Viewer, a: Author) => a.sub === v.sub && !a.sub.startsWith('confluence:')
const canSee = (v: Viewer, group?: string) => !group || v.groups.includes(group) || v.admin
const clean = (s: unknown, max: number, what: string) => {
  const t = typeof s === 'string' ? s.replace(/\r\n?/g, '\n').trim() : ''
  if (!t) throw new Refused(`${what} is empty`)
  if (t.length > max) throw new Refused(`${what} is too long (${max} characters at most)`)
  return t
}

/** What a post or comment says: allow-listed `html` from the editor, or `text` from the plain box (older clients). */
function content(input: { html?: unknown; text?: unknown }, what: string): { html?: string; text?: string } {
  if (typeof input.html !== 'string') return { text: clean(input.text, TEXT_MAX, what) }
  if (input.html.length > HTML_MAX) throw new Refused(`${what} is too long`)
  const html = sanitizeHtml(unlinkFiles(input.html))
  if (!hasContent(html)) throw new Refused(`${what} is empty`)
  if (html.length > HTML_MAX) throw new Refused(`${what} is too long`)
  return { html }
}

export { newId } from './ids'

const NEW_ID = /^n[0-9a-z]{6,20}$/
const threadFile = (id: string) => `threads/${id}.json`
const isId = (id: unknown): id is string => typeof id === 'string' && /^[\w-]{1,40}$/.test(id)

/** Reads a JSON file, runs `change` on it and writes it back, again from a fresh read when someone else wrote first. */
async function update<T>(store: ForumStore, name: string, empty: T, change: (value: T) => T | null): Promise<T | null> {
  for (let i = 0; i < RETRIES; i++) {
    const got = await store.read(name)
    const next = change(got ? (got.value as T) : empty)
    if (next === null) return null
    if (await store.write(name, next, got?.tag ?? null)) return next
  }
  throw new Error(`Could not write ${name}: too many simultaneous changes`)
}

export async function listThreads(store: ForumStore, v: Viewer): Promise<ThreadMeta[]> {
  const got = await store.read('index.json')
  return ((got?.value ?? []) as ThreadMeta[]).filter((m) => canSee(v, m.group))
}

export async function readThread(store: ForumStore, v: Viewer, id: string): Promise<Thread | null> {
  if (!isId(id)) return null
  const got = await store.read(threadFile(id))
  const t = got?.value as Thread | undefined
  if (!t || !canSee(v, t.group) || (t.hidden && !v.admin)) return null
  return v.admin ? t : { ...t, comments: t.comments.filter((c) => !c.hidden) }
}

/** The few newest threads anyone may see, for the home page: only titles, authors and counts, nothing of the posts. */
export async function recentThreads(store: ForumStore): Promise<ThreadMeta[]> {
  const got = await store.read('recent.json')
  return (got?.value ?? []) as ThreadMeta[]
}

/** Puts a thread's summary into the list (dropping it when the thread is hidden), newest activity first, and refreshes the home feed. */
async function reindex(store: ForumStore, t: Thread) {
  const meta = metaOf(t)
  const index = await update<ThreadMeta[]>(store, 'index.json', [], (list) => {
    const rest = list.filter((m) => m.id !== t.id)
    return (t.hidden ? rest : [meta, ...rest]).toSorted((a, b) => b.last.localeCompare(a.last))
  })
  await update<ThreadMeta[]>(store, 'recent.json', [], () => (index ?? []).filter((m) => !m.group).slice(0, RECENT_COUNT))
  const notice = noticeOf(t)
  await update<Notice[]>(store, 'notices.json', [], (list) => {
    const rest = list.filter((n) => n.id !== t.id)
    return notice ? [notice, ...rest] : rest.length === list.length ? null : rest
  })
}

/** The notices that have not run out, for the home page (public: they are the texts an admin chose to show everyone). */
export async function activeNotices(store: ForumStore, now = new Date()): Promise<Notice[]> {
  const got = await store.read('notices.json')
  return ((got?.value ?? []) as Notice[]).filter((n) => n.until > now.toISOString())
}

/** Admin: make a thread a notice until `until` (an ISO time in the future, within a year), or stop it being one (`until` null). Restricted threads cannot be notices. */
export async function setNotice(store: ForumStore, v: Viewer, input: { thread?: unknown; until?: unknown }, now = new Date()): Promise<Thread> {
  if (!v.admin) throw new Refused('Only an admin can do that')
  const id = isId(input.thread) ? input.thread : ''
  let until: string | undefined
  if (input.until !== null && input.until !== undefined) {
    const at = typeof input.until === 'string' ? new Date(input.until) : new Date(NaN)
    if (Number.isNaN(at.getTime()) || at <= now) throw new Refused('The end of a notice must be a time in the future')
    if (at.getTime() - now.getTime() > NOTICE_MAX_DAYS * 86_400_000) throw new Refused('A notice can last a year at most')
    until = at.toISOString()
  }
  const t = await update<Thread | null>(store, threadFile(id), null, (cur) => {
    if (!cur) throw new Refused('No such post')
    if (until && (cur.group || cur.hidden)) throw new Refused('A restricted or hidden post cannot be a notice')
    return { ...cur, notice: until }
  })
  if (!t) throw new Refused('No such post')
  await reindex(store, t)
  return t
}

export async function createThread(store: ForumStore, v: Viewer, input: { id?: unknown; title?: unknown; text?: unknown; html?: unknown }, now = new Date()): Promise<Thread> {
  const t: Thread = {
    // The editor picks the id first when the post has pictures, so they can be stored under it; a taken id fails the write below.
    id: typeof input.id === 'string' && NEW_ID.test(input.id) ? input.id : newId(now.getTime()),
    title: clean(input.title, TITLE_MAX, 'The title'),
    author: authorOf(v),
    at: now.toISOString(),
    ...content(input, 'The post'),
    comments: [],
  }
  if (!(await store.write(threadFile(t.id), t, null))) throw new Error('Could not save the post')
  await reindex(store, t)
  return t
}

export async function addComment(store: ForumStore, v: Viewer, input: { thread?: unknown; parent?: unknown; text?: unknown; html?: unknown }, now = new Date()): Promise<Thread> {
  const body = content(input, 'The comment')
  const id = isId(input.thread) ? input.thread : ''
  const parent = input.parent == null ? null : String(input.parent)
  const comment: Comment = { id: newId(now.getTime()), parent, author: authorOf(v), at: now.toISOString(), ...body }
  const t = await update<Thread | null>(store, threadFile(id), null, (cur) => {
    if (!cur || !canSee(v, cur.group) || cur.hidden) throw new Refused('No such post')
    if (parent !== null && !cur.comments.some((c) => c.id === parent)) throw new Refused('The comment you are replying to is gone')
    const last = cur.comments.at(-1)
    if (last && last.author.sub === v.sub && last.text === body.text && last.html === body.html) return cur // a double click
    return { ...cur, comments: [...cur.comments, comment] }
  })
  if (!t) throw new Refused('No such post')
  await reindex(store, t)
  return t
}

/** The post or comment with its words replaced, whichever form (`html` or `text`) it and the new words are in. */
function withBody<T extends { html?: string; text?: string }>(x: T, body: { html?: string; text?: string }): T {
  const { html: _html, text: _text, ...rest } = x
  return { ...rest, ...body } as T
}

/**
 * The author changes the text of their own comment, or (with no `comment`) of their own post, whose title may change too.
 * Imported posts are HTML from Confluence, but their authors are not Cognito users, so only posts written here can be edited.
 */
export async function editPost(store: ForumStore, v: Viewer, input: { thread?: unknown; comment?: unknown; title?: unknown; text?: unknown; html?: unknown }, now = new Date()): Promise<Thread> {
  const body = content(input, input.comment == null ? 'The post' : 'The comment')
  const title = input.comment == null && input.title !== undefined ? clean(input.title, TITLE_MAX, 'The title') : undefined
  const id = isId(input.thread) ? input.thread : ''
  const at = now.toISOString()
  const t = await update<Thread | null>(store, threadFile(id), null, (cur) => {
    if (!cur || !canSee(v, cur.group) || cur.hidden) throw new Refused('No such post')
    if (input.comment == null) {
      if (!isOwn(v, cur.author)) throw new Refused('You can only edit your own posts')
      return { ...withBody(cur, body), ...(title && { title }), edited: at }
    }
    const c = cur.comments.find((x) => x.id === input.comment)
    if (!c || c.hidden) throw new Refused('No such comment')
    if (!isOwn(v, c.author)) throw new Refused('You can only edit your own comments')
    return { ...cur, comments: cur.comments.map((x) => (x === c ? { ...withBody(c, body), edited: at } : x)) }
  })
  if (!t) throw new Refused('No such post')
  await reindex(store, t)
  return t
}

/**
 * The author deletes their own comment, or their own post when nobody else has commented on it; an admin deletes anyone's comment or post (with its comments). The text stays in the file
 * (hidden and marked removed, `removedBy: 'admin'` when an admin did it), so a mistaken delete can be put right by hand; nobody but an admin reading the file sees it.
 */
export async function removePost(store: ForumStore, v: Viewer, input: { thread?: unknown; comment?: unknown }): Promise<Thread> {
  const id = isId(input.thread) ? input.thread : ''
  const by = v.admin ? ({ removedBy: 'admin' } as const) : {}
  const t = await update<Thread | null>(store, threadFile(id), null, (cur) => {
    if (!cur || !canSee(v, cur.group) || (cur.hidden && !v.admin) || cur.removed) throw new Refused('No such post')
    if (input.comment == null) {
      if (!v.admin && cur.author.sub !== v.sub) throw new Refused('You can only delete your own posts')
      if (!v.admin && cur.comments.some((c) => !c.hidden && c.author.sub !== v.sub)) throw new Refused('Others have commented on this post, so only an admin can remove it')
      return { ...cur, hidden: true, removed: true, ...by, notice: undefined }
    }
    const c = cur.comments.find((x) => x.id === input.comment)
    if (!c || (c.hidden && !v.admin) || c.removed) throw new Refused('No such comment')
    if (!v.admin && c.author.sub !== v.sub) throw new Refused('You can only delete your own comments')
    return { ...cur, comments: cur.comments.map((x) => (x === c ? { ...c, hidden: true, removed: true, ...by } : x)) }
  })
  if (!t) throw new Refused('No such post')
  await reindex(store, t)
  return t
}

/** Admin: hide or show a thread (`comment` unset) or one comment. Hidden things stay in the file. */
export async function setHidden(store: ForumStore, v: Viewer, input: { thread?: unknown; comment?: unknown; hidden?: unknown }): Promise<Thread> {
  if (!v.admin) throw new Refused('Only an admin can do that')
  const id = isId(input.thread) ? input.thread : ''
  const hidden = input.hidden === true
  const t = await update<Thread | null>(store, threadFile(id), null, (cur) => {
    if (!cur) throw new Refused('No such post')
    if (cur.removed && input.comment == null) throw new Refused('This post was deleted')
    // A cleared flag is `undefined`, which JSON leaves out.
    const flag = hidden ? true : undefined
    if (input.comment == null) return { ...cur, hidden: flag }
    if (!cur.comments.some((c) => c.id === input.comment)) throw new Refused('No such comment')
    if (cur.comments.some((c) => c.id === input.comment && c.removed)) throw new Refused('This comment was deleted')
    return { ...cur, comments: cur.comments.map((c) => (c.id === input.comment ? { ...c, hidden: flag } : c)) }
  })
  if (!t) throw new Refused('No such post')
  await reindex(store, t)
  return t
}
