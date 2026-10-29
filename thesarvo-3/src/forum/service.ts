import { metaOf, noticeOf } from './types'
import type { Author, Comment, Notice, Thread, ThreadMeta } from './types'
import type { ForumStore } from './store'

export const TITLE_MAX = 120
export const TEXT_MAX = 10_000
export const RECENT_COUNT = 8
/** A notice lasts at most this long. */
export const NOTICE_MAX_DAYS = 366
const RETRIES = 6

/** Who is asking: `groups` decide which restricted threads they see; `admin` may hide things. */
export type Viewer = Author & { groups: readonly string[]; admin: boolean }

const authorOf = (v: Viewer): Author => ({ sub: v.sub, name: v.name, ...(v.key && { key: v.key }) })

export class Refused extends Error {}

const canSee = (v: Viewer, group?: string) => !group || v.groups.includes(group) || v.admin
const clean = (s: unknown, max: number, what: string) => {
  const t = typeof s === 'string' ? s.replace(/\r\n?/g, '\n').trim() : ''
  if (!t) throw new Refused(`${what} is empty`)
  if (t.length > max) throw new Refused(`${what} is too long (${max} characters at most)`)
  return t
}

/** A new id: sortable by time, and unlike Confluence's numbers it never collides with an imported thread. */
export const newId = (now = Date.now(), rand = Math.random()) => `n${now.toString(36)}${Math.floor(rand * 36 ** 3).toString(36).padStart(3, '0')}`

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

export async function createThread(store: ForumStore, v: Viewer, input: { title?: unknown; text?: unknown }, now = new Date()): Promise<Thread> {
  const t: Thread = {
    id: newId(now.getTime()),
    title: clean(input.title, TITLE_MAX, 'The title'),
    author: authorOf(v),
    at: now.toISOString(),
    text: clean(input.text, TEXT_MAX, 'The post'),
    comments: [],
  }
  if (!(await store.write(threadFile(t.id), t, null))) throw new Error('Could not save the post')
  await reindex(store, t)
  return t
}

export async function addComment(store: ForumStore, v: Viewer, input: { thread?: unknown; parent?: unknown; text?: unknown }, now = new Date()): Promise<Thread> {
  const text = clean(input.text, TEXT_MAX, 'The comment')
  const id = isId(input.thread) ? input.thread : ''
  const parent = input.parent == null ? null : String(input.parent)
  const comment: Comment = { id: newId(now.getTime()), parent, author: authorOf(v), at: now.toISOString(), text }
  const t = await update<Thread | null>(store, threadFile(id), null, (cur) => {
    if (!cur || !canSee(v, cur.group) || cur.hidden) throw new Refused('No such post')
    if (parent !== null && !cur.comments.some((c) => c.id === parent)) throw new Refused('The comment you are replying to is gone')
    const last = cur.comments.at(-1)
    if (last && last.author.sub === v.sub && last.text === text) return cur // a double click
    return { ...cur, comments: [...cur.comments, comment] }
  })
  if (!t) throw new Refused('No such post')
  await reindex(store, t)
  return t
}

/**
 * The author changes the text of their own comment, or (with no `comment`) of their own post, whose title may change too.
 * Only text written here can be edited: imported posts are HTML from Confluence, and their authors are not Cognito users anyway.
 */
export async function editPost(store: ForumStore, v: Viewer, input: { thread?: unknown; comment?: unknown; title?: unknown; text?: unknown }, now = new Date()): Promise<Thread> {
  const text = clean(input.text, TEXT_MAX, input.comment == null ? 'The post' : 'The comment')
  const title = input.comment == null && input.title !== undefined ? clean(input.title, TITLE_MAX, 'The title') : undefined
  const id = isId(input.thread) ? input.thread : ''
  const at = now.toISOString()
  const t = await update<Thread | null>(store, threadFile(id), null, (cur) => {
    if (!cur || !canSee(v, cur.group) || cur.hidden) throw new Refused('No such post')
    if (input.comment == null) {
      if (cur.author.sub !== v.sub || cur.text === undefined) throw new Refused('You can only edit your own posts')
      return { ...cur, ...(title && { title }), text, edited: at }
    }
    const c = cur.comments.find((x) => x.id === input.comment)
    if (!c || c.hidden) throw new Refused('No such comment')
    if (c.author.sub !== v.sub || c.text === undefined) throw new Refused('You can only edit your own comments')
    return { ...cur, comments: cur.comments.map((x) => (x === c ? { ...c, text, edited: at } : x)) }
  })
  if (!t) throw new Refused('No such post')
  await reindex(store, t)
  return t
}

/**
 * The author deletes their own comment, or their own post when nobody else has commented on it. The text stays in the file
 * (hidden and marked removed), so a mistaken delete can be put right by hand; nobody but an admin reading the file sees it.
 */
export async function removePost(store: ForumStore, v: Viewer, input: { thread?: unknown; comment?: unknown }): Promise<Thread> {
  const id = isId(input.thread) ? input.thread : ''
  const t = await update<Thread | null>(store, threadFile(id), null, (cur) => {
    if (!cur || !canSee(v, cur.group) || cur.hidden) throw new Refused('No such post')
    if (input.comment == null) {
      if (cur.author.sub !== v.sub) throw new Refused('You can only delete your own posts')
      if (cur.comments.some((c) => !c.hidden && c.author.sub !== v.sub)) throw new Refused('Others have commented on this post, so only an admin can remove it')
      return { ...cur, hidden: true, removed: true, notice: undefined }
    }
    const c = cur.comments.find((x) => x.id === input.comment)
    if (!c || c.hidden) throw new Refused('No such comment')
    if (c.author.sub !== v.sub) throw new Refused('You can only delete your own comments')
    return { ...cur, comments: cur.comments.map((x) => (x === c ? { ...c, hidden: true, removed: true } : x)) }
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
    if (cur.removed && input.comment == null) throw new Refused('The author deleted this post')
    // A cleared flag is `undefined`, which JSON leaves out.
    const flag = hidden ? true : undefined
    if (input.comment == null) return { ...cur, hidden: flag }
    if (!cur.comments.some((c) => c.id === input.comment)) throw new Refused('No such comment')
    if (cur.comments.some((c) => c.id === input.comment && c.removed)) throw new Refused('The author deleted this comment')
    return { ...cur, comments: cur.comments.map((c) => (c.id === input.comment ? { ...c, hidden: flag } : c)) }
  })
  if (!t) throw new Refused('No such post')
  await reindex(store, t)
  return t
}
