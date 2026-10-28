import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useEscape, useScrollLock } from './overlay'

type PageKind = 'guide' | 'html'

const field = 'mt-1 w-full rounded-md border border-line bg-white px-3 py-2 focus:border-link focus:outline-none'
const TITLE_MAX = 80

/** Page types. HTML pages (prose) come with their own editor later. */
const KINDS: { kind: PageKind; label: string; ready: boolean }[] = [
  { kind: 'guide', label: 'Guide', ready: true },
  { kind: 'html', label: 'HTML page (coming later)', ready: false },
]

/**
 * Asks what kind of page to add under `parent` and what to call it, saves it, then opens it in the editor. A new page
 * reaches the static site about 20 seconds after it is saved, so this waits for that before going there.
 */
export function AddPageDialog({ parent, parentTitle, onClose }: { parent: string; parentTitle: string; onClose: () => void }) {
  const navigate = useNavigate()
  const [kind, setKind] = useState<PageKind>('guide')
  const [title, setTitle] = useState('')
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({})
  useScrollLock(true)
  useEscape(!state.busy, onClose)

  const submit = async () => {
    const name = title.replace(/\s+/g, ' ').trim()
    if (!name) return setState({ error: 'Give the page a name' })
    if (/[<>]/.test(name)) return setState({ error: 'The name cannot contain < or >' })
    setState({ busy: true })
    // Loaded now, not with the page: readers never download the editor's code.
    const { createPage, waitForPage } = await import('#/guide/edit/createPage')
    const made = await createPage(parent, name, kind)
    if (!made.ok) return setState({ error: made.message })
    const path = await waitForPage(made.value.id)
    if (path === null) return setState({ error: 'The page is saved but is taking a while to appear. Look for it under this page in a minute.' })
    onClose()
    await navigate({ to: '/g/$', params: { _splat: path }, search: { edit: true } })
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onPointerDown={(e) => e.target === e.currentTarget && !state.busy && onClose()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Add a page"
        className="w-full max-w-md space-y-4 rounded-t-lg bg-white p-5 shadow-xl sm:rounded-lg"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <h3 className="text-lg font-semibold">Add a page under {parentTitle}</h3>
        <label className="block">
          <span className="text-sm font-medium">Type of page</span>
          <select className={field} value={kind} disabled={state.busy} onChange={(e) => setKind(e.target.value === 'html' ? 'html' : 'guide')}>
            {KINDS.map((k) => (
              <option key={k.kind} value={k.kind} disabled={!k.ready}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Name</span>
          <input className={field} autoFocus required maxLength={TITLE_MAX} disabled={state.busy} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="For example, Fossil Cove" />
        </label>
        {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
        {state.busy ? (
          <p role="status" className="text-sm text-muted">Adding the page. It goes live in about 20 seconds, then opens for editing…</p>
        ) : (
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-line px-4 py-2">
              Cancel
            </button>
            <button type="submit" className="rounded-md bg-brand px-4 py-2 text-white">
              Add and edit
            </button>
          </div>
        )}
      </form>
    </div>,
    document.body,
  )
}
