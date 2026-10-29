import { useEffect, useMemo, useState } from 'react'
import { useUser } from '#/auth/session'
import { Avatar } from '#/guide/avatars/Avatar'
import { getThread, listThreads, post } from '../client'
import type { Author, Comment, Thread, ThreadMeta } from '../types'
import { Body } from './Body'

const when = (iso: string) => new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
const field = 'w-full rounded-md border border-line bg-white px-3 py-2 focus:border-link focus:outline-none'
const button = 'rounded-md bg-brand px-4 py-2 text-white disabled:opacity-50'
const idsOf = (a: Author) => [a.sub, a.key].filter((x): x is string => !!x)

function Who({ author, at, edited }: { author: Author; at: string; edited?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <Avatar ids={idsOf(author)} name={author.name} className="size-6 text-xs" />
      <span className="font-medium text-ink">{author.name}</span>
      <time dateTime={at}>{when(at)}</time>
      {edited && <span title={`Edited ${when(edited)}`}>(edited)</span>}
    </div>
  )
}

/** A text box with a button; clears itself after a successful send. */
function Compose({ label, rows = 4, title, initial, onSend, onCancel }: { label: string; rows?: number; title?: boolean; initial?: { text: string; title?: string }; onSend: (text: string, title: string) => Promise<string | null>; onCancel?: () => void }) {
  const [text, setText] = useState(initial?.text ?? '')
  const [head, setHead] = useState(initial?.title ?? '')
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({})
  const send = async () => {
    setState({ busy: true })
    const error = await onSend(text, head)
    if (error) setState({ error })
    else if (initial) setState({})
    else {
      setText('')
      setHead('')
      setState({})
    }
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void send()
      }}
      className="space-y-2"
    >
      {title && <input value={head} onChange={(e) => setHead(e.target.value)} placeholder="Title" aria-label="Title" maxLength={120} className={field} />}
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={rows} aria-label={label} placeholder={label} className={field} />
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={state.busy || !text.trim() || (title === true && !head.trim())} className={button}>
          {state.busy ? 'Sending…' : label}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-3 py-2 text-muted hover:underline">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

/** What the signed-in person can do to their own posts and comments. `editing` is `'post'` or a comment's id. */
type Own = { sub: string; editing: string | null; setEditing: (id: string | null) => void; edit: (comment: string | null, text: string, title?: string) => Promise<string | null>; remove: (comment: string | null) => void }

/** Edit and Delete for something the person wrote here (imported posts have no plain text to edit). */
function OwnButtons({ id, author, plain, own }: { id: string; author: Author; plain: boolean; own: Own }) {
  if (!plain || author.sub !== own.sub) return null
  return (
    <>
      <button type="button" onClick={() => own.setEditing(own.editing === id ? null : id)} className="text-link hover:underline">
        Edit
      </button>
      <button type="button" onClick={() => own.remove(id === 'post' ? null : id)} className="text-muted hover:underline">
        Delete
      </button>
    </>
  )
}

function CommentNode({ c, kids, depth, reply, setReply, send, admin, hide, own }: { c: Comment; kids: Map<string | null, Comment[]>; depth: number; reply: string | null; setReply: (id: string | null) => void; send: (parent: string | null, text: string) => Promise<string | null>; admin: boolean; hide: (c: Comment) => void; own: Own }) {
  return (
    <li className={depth ? 'mt-3 border-l-2 border-line pl-3' : 'mt-4'}>
      <div className={c.hidden ? 'opacity-50' : ''}>
        <Who author={c.author} at={c.at} edited={c.edited} />
        {own.editing === c.id ? (
          <div className="mt-1">
            <Compose label="Save" rows={3} initial={{ text: c.text ?? '' }} onSend={(t) => own.edit(c.id, t)} onCancel={() => own.setEditing(null)} />
          </div>
        ) : (
          <div className="mt-1">
            <Body html={c.html} text={c.text} />
          </div>
        )}
        <div className="mt-1 flex gap-3 text-sm">
          <button type="button" onClick={() => setReply(reply === c.id ? null : c.id)} className="text-link hover:underline">
            Reply
          </button>
          <OwnButtons id={c.id} author={c.author} plain={c.text !== undefined} own={own} />
          {admin && !c.removed && (
            <button type="button" onClick={() => hide(c)} className="text-muted hover:underline">
              {c.hidden ? 'Show' : 'Hide'}
            </button>
          )}
          {c.removed && <span className="text-muted">Deleted by its author</span>}
        </div>
      </div>
      {reply === c.id && (
        <div className="mt-2">
          <Compose label="Reply" rows={3} onSend={(t) => send(c.id, t)} onCancel={() => setReply(null)} />
        </div>
      )}
      {!!kids.get(c.id)?.length && (
        <ul>
          {kids.get(c.id)!.map((k) => (
            <CommentNode key={k.id} c={k} kids={kids} depth={Math.min(depth + 1, 4)} reply={reply} setReply={setReply} send={send} admin={admin} hide={hide} own={own} />
          ))}
        </ul>
      )}
    </li>
  )
}

const DAY = 86_400_000
const DURATIONS = [
  ['a day', 1],
  ['a week', 7],
  ['two weeks', 14],
  ['a month', 30],
  ['three months', 90],
] as const

/** Admin: show this post's title and text at the top of the home page and the forum for a while. */
function NoticeControls({ thread, onChange }: { thread: Thread; onChange: (t: Thread) => void }) {
  const [days, setDays] = useState(7)
  const [error, setError] = useState('')
  const live = thread.notice && thread.notice > new Date().toISOString()
  const set = async (until: string | null) => {
    const a = await post({ action: 'notice', thread: thread.id, until })
    if (a.ok) {
      setError('')
      onChange(a.value)
    } else setError(a.message)
  }
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md bg-amber/10 px-3 py-2 text-sm">
      {live ? (
        <>
          <span>A notice until {when(thread.notice!)}.</span>
          <button type="button" onClick={() => void set(null)} className="text-link hover:underline">
            End it now
          </button>
        </>
      ) : (
        <>
          <label>
            Show as a notice for{' '}
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded border border-line bg-white px-1 py-0.5">
              {DURATIONS.map(([label, d]) => (
                <option key={d} value={d}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => void set(new Date(Date.now() + days * DAY).toISOString())} className="text-link hover:underline">
            Show it on the home page
          </button>
        </>
      )}
      {error && <span role="alert" className="text-red-700">{error}</span>}
    </div>
  )
}

function ThreadView({ id, back }: { id: string; back: () => void }) {
  const user = useUser()
  const [thread, setThread] = useState<Thread | null>(null)
  const [error, setError] = useState('')
  const [reply, setReply] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    void getThread(id).then((a) => live && (a.ok ? setThread(a.value) : setError(a.message)))
    return () => {
      live = false
    }
  }, [id])
  const kids = useMemo(() => {
    const ids = new Set(thread?.comments.map((c) => c.id))
    const m = new Map<string | null, Comment[]>()
    // A reply to a comment that is gone (hidden) shows at the top.
    for (const c of thread?.comments ?? []) m.set(c.parent && ids.has(c.parent) ? c.parent : null, [...(m.get(c.parent && ids.has(c.parent) ? c.parent : null) ?? []), c])
    return m
  }, [thread])
  if (error) return <p role="alert">{error}</p>
  if (!thread) return <p className="text-muted">Loading…</p>
  const send = async (parent: string | null, text: string) => {
    const a = await post({ action: 'comment', thread: id, parent, text })
    if (!a.ok) return a.message
    setThread(a.value)
    setReply(null)
    return null
  }
  const hide = async (c: Comment) => {
    const a = await post({ action: 'hide', thread: id, comment: c.id, hidden: !c.hidden })
    if (a.ok) setThread(a.value)
  }
  const edit = async (comment: string | null, text: string, title?: string) => {
    const a = await post({ action: 'edit', thread: id, ...(comment && { comment }), ...(title !== undefined && { title }), text })
    if (!a.ok) return a.message
    setThread(a.value)
    setEditing(null)
    return null
  }
  const remove = async (comment: string | null) => {
    if (!confirm(comment ? 'Delete your comment?' : 'Delete your post?')) return
    const a = await post({ action: 'remove', thread: id, ...(comment && { comment }) })
    if (!a.ok) return setError(a.message)
    if (comment) setThread(a.value)
    else back()
  }
  const own: Own = { sub: user?.sub ?? '', editing, setEditing, edit, remove: (c) => void remove(c) }
  return (
    <article>
      <button type="button" onClick={back} className="text-sm text-link hover:underline">
        ← All posts
      </button>
      <h1 className="mt-2 text-2xl font-bold text-navy">{thread.title}</h1>
      <div className="mt-2">
        <Who author={thread.author} at={thread.at} edited={thread.edited} />
      </div>
      {editing === 'post' ? (
        <div className="mt-3">
          <Compose label="Save" title rows={6} initial={{ text: thread.text ?? '', title: thread.title }} onSend={(t, h) => edit(null, t, h)} onCancel={() => setEditing(null)} />
        </div>
      ) : (
        <div className="mt-3">
          <Body html={thread.html} text={thread.text} />
        </div>
      )}
      <div className="mt-2 flex gap-3 text-sm">
        <OwnButtons id="post" author={thread.author} plain={thread.text !== undefined} own={own} />
      </div>
      {user?.admin && !thread.group && <NoticeControls thread={thread} onChange={setThread} />}
      <h2 className="mt-8 border-b border-line pb-1 text-lg font-bold text-navy">
        {thread.comments.length} {thread.comments.length === 1 ? 'comment' : 'comments'}
      </h2>
      <ul>
        {(kids.get(null) ?? []).map((c) => (
          <CommentNode key={c.id} c={c} kids={kids} depth={0} reply={reply} setReply={setReply} send={send} admin={!!user?.admin} hide={hide} own={own} />
        ))}
      </ul>
      <div className="mt-6">
        <Compose label="Comment" onSend={(t) => send(null, t)} />
      </div>
    </article>
  )
}

const PAGE = 40
const isLive = (t: ThreadMeta) => !!t.notice && t.notice > new Date().toISOString()

function ThreadList({ open }: { open: (id: string) => void }) {
  const [threads, setThreads] = useState<ThreadMeta[] | null>(null)
  const [error, setError] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [composing, setComposing] = useState(false)
  useEffect(() => {
    let live = true
    void listThreads().then((a) => live && (a.ok ? setThreads(a.value) : setError(a.message)))
    return () => {
      live = false
    }
  }, [])
  const create = async (text: string, title: string) => {
    const a = await post({ action: 'thread', title, text })
    if (!a.ok) return a.message
    open(a.value.id)
    return null
  }
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-navy">Forum</h1>
        <button type="button" onClick={() => setComposing((c) => !c)} className={button}>
          New post
        </button>
      </div>
      {composing && (
        <div className="mt-4 rounded-lg border border-line bg-card p-4">
          <Compose label="Post" title rows={6} onSend={create} onCancel={() => setComposing(false)} />
        </div>
      )}
      {error && <p role="alert" className="mt-4">{error}</p>}
      {!threads && !error && <p className="mt-4 text-muted">Loading…</p>}
      {threads && (
        <>
          <ul className="mt-4 divide-y divide-line">
            {[...threads.filter((t) => isLive(t)), ...threads.filter((t) => !isLive(t))].slice(0, shown).map((t) => (
              <li key={t.id} className={isLive(t) ? 'bg-amber/10 px-2 py-2' : 'py-2'}>
                {isLive(t) && <span className="mr-2 text-xs font-semibold tracking-wide text-amber-800 uppercase">Notice</span>}
                <button type="button" onClick={() => open(t.id)} className="text-left font-semibold text-link hover:underline">
                  {t.title}
                </button>
                <div className="text-sm text-muted">
                  {t.author.name} · {when(t.at)} · {t.comments} {t.comments === 1 ? 'comment' : 'comments'}
                  {t.last !== t.at && <> · last {when(t.last)}</>}
                </div>
              </li>
            ))}
          </ul>
          {shown < threads.length && (
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className="mt-4 text-link hover:underline">
              Show more ({threads.length - shown} older)
            </button>
          )}
        </>
      )}
    </div>
  )
}

/** The forum for signed-in users: the list of posts, or one post (`thread`) with its comments. */
export function ForumPage({ thread, go }: { thread?: string; go: (thread?: string) => void }) {
  const user = useUser()
  if (!user)
    return <p className="text-muted">The forum is for signed-in members. Use the person button at the top right to sign in.</p>
  return thread ? <ThreadView id={thread} back={() => go()} /> : <ThreadList open={(id) => go(id)} />
}
