import { useCallback, useEffect, useRef, useState } from 'react'
import { call } from '#/auth/apiCall'
import { imageUrl } from '#/guide/content/paths'
import { LazyRichEditor } from './LazyRichEditor'
import { useKeyboardInset } from './keyboardInset'
import { clearRichDraft, loadRichDraft, saveRichDraft } from './drafts'

type Loaded = { head: string; html: string }
type SaveAnswer = { status: 'saved'; html: string; at?: string } | { status: 'conflict'; html: string } | { status: 'missing' }

const session = () => `s${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`

/**
 * Edits a prose page: the HTML as last saved (not as published, which can be a minute behind), the rich text box, and a Save button
 * that commits it through `/g/api/page`. What is typed is kept in this browser as a draft until it is saved or discarded.
 */
export default function PageBodyEditor({ id, title, done }: { id: string; title: string; done: () => void }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    void call<Loaded>(`page?id=${id}`).then((a) => live && (a.ok ? setLoaded(a.value) : setError(a.message)))
    return () => {
      live = false
    }
  }, [id])
  if (error) return <p role="alert" className="p-8">{error}</p>
  if (!loaded) return <p className="p-8 text-muted">Loading the page…</p>
  return <Loaded id={id} title={title} done={done} stored={loaded.html} />
}

function Loaded({ id, title, done, stored }: { id: string; title: string; done: () => void; stored: string }) {
  const key = `page.${id}`
  const [base, setBase] = useState(stored)
  const [draft, setDraft] = useState(() => loadRichDraft(key, stored))
  const [start, setStart] = useState(draft && !draft.stale ? draft.html : stored)
  const [gen, setGen] = useState(0)
  const [html, setHtml] = useState(start)
  const keyboardInset = useKeyboardInset()
  const [dirty, setDirty] = useState(!!draft && !draft.stale)
  const [state, setState] = useState<{ busy?: boolean; error?: string; saved?: string }>({})
  const sessionId = useRef(session())

  useEffect(() => {
    // An old draft waits for the writer's choice (below); typing meanwhile is not drafted over it.
    if (!dirty || draft?.stale) return
    const t = setTimeout(() => saveRichDraft(key, { html, base }), 500)
    return () => clearTimeout(t)
  }, [dirty, draft, html, base, key])
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const upload = useCallback(async (file: File, onProgress: (fraction: number) => void) => (await import('#/guide/edit/upload')).uploadImage(id, file, onProgress), [id])

  const save = useCallback(async () => {
    setState({ busy: true })
    const a = await call<SaveAnswer>('page', { method: 'POST', body: JSON.stringify({ page: id, session: sessionId.current, base, html, title }) })
    if (!a.ok) return setState({ error: a.unavailable ? 'Saving is not set up here.' : a.message })
    const r = a.value
    if (r.status === 'conflict') return setState({ error: 'Someone else saved this page since you opened it. Your text is kept here as a draft: reload the page to see theirs, and your draft is offered again.' })
    if (r.status === 'missing') return setState({ error: 'This page no longer exists.' })
    clearRichDraft(key)
    setDraft(null)
    setBase(r.html)
    setDirty(false)
    setState({ saved: 'Saved. It goes live in about 20 seconds.' })
  }, [id, base, html, title, key])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 's') return
      e.preventDefault()
      if (dirty && !state.busy) void save()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dirty, state.busy, save])

  const discard = () => {
    clearRichDraft(key)
    setDraft(null)
    setStart(base)
    setHtml(base)
    setDirty(false)
    setGen((g) => g + 1)
  }
  const useOld = () => {
    if (!draft) return
    setDraft({ ...draft, stale: false })
    setStart(draft.html)
    setHtml(draft.html)
    setDirty(true)
    setGen((g) => g + 1)
  }
  const leave = () => {
    if (dirty && !confirm('Leave without saving? Your changes stay here as a draft.')) return
    done()
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <h1 className="border-b border-line pb-1 text-[28px] font-bold text-navy">{title}</h1>
      {draft?.stale && (
        <p role="status" className="mt-3 text-sm text-muted">
          You have an unsaved draft from {new Date(draft.savedAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}, made before this page was changed by someone else.{' '}
          <button type="button" onClick={useOld} className="text-link hover:underline">
            Open it
          </button>{' '}
          (saving it replaces their version) or{' '}
          <button type="button" onClick={discard} className="text-link hover:underline">
            discard it
          </button>
          .
        </p>
      )}
      {draft && !draft.stale && (
        <p role="status" className="mt-3 text-sm text-muted">
          Your unsaved draft from {new Date(draft.savedAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })} is back.{' '}
          <button type="button" onClick={discard} className="text-link hover:underline">
            Discard it
          </button>
        </p>
      )}
      <div className="mt-4">
        <LazyRichEditor
          key={gen}
          initial={start}
          onChange={(h) => {
            setHtml(h)
            setDirty(true)
            setState((s) => (s.saved ? {} : s))
          }}
          upload={upload}
          resolveFile={(name) => imageUrl(id, name)}
          label={`Text of ${title}`}
          placeholder="Write the page…"
        />
      </div>
      <div style={{ bottom: keyboardInset }} className="sticky mt-4 flex flex-wrap items-center gap-3 border-t border-line bg-paper py-3">
        <button type="button" onClick={() => void save()} disabled={!dirty || state.busy} className="rounded-md bg-brand px-4 py-2 text-white disabled:opacity-50">
          {state.busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={leave} className="px-3 py-2 text-muted hover:underline">
          {dirty ? 'Cancel' : 'Done'}
        </button>
        <span role="status" aria-live="polite" className="text-sm text-muted">
          {state.saved ?? (dirty ? 'Unsaved changes' : '')}
        </span>
        {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
      </div>
    </div>
  )
}
