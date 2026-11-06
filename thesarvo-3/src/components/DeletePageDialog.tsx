import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useEscape, useScrollLock } from './overlay'

/**
 * Asks an admin to confirm taking a page (and the pages under it) off the site, then goes to the page above it. The pages leave the static site about
 * 20 seconds after the commit, so this waits for that before going there. The pages' files stay in the content repo, so the commit can be reverted.
 */
export function DeletePageDialog({ page, below, parentPath, onClose }: { page: { id: string; title: string }; below: number; parentPath: string; onClose: () => void }) {
  const navigate = useNavigate()
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({})
  useScrollLock(true)
  useEscape(!state.busy, onClose)

  const submit = async () => {
    setState({ busy: true })
    // Loaded now, not with the page: readers never download the editor's code.
    const { deletePage, waitForGone } = await import('#/guide/edit/deletePage')
    const done = await deletePage(page.id)
    if (!done.ok) return setState({ error: done.message })
    const gone = await waitForGone(page.id)
    if (!gone) return setState({ error: 'The page is deleted but is taking a while to leave the site. It will be gone in a minute.' })
    onClose()
    await navigate({ to: '/g/$', params: { _splat: parentPath } })
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onPointerDown={(e) => e.target === e.currentTarget && !state.busy && onClose()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Delete this page"
        className="w-full max-w-md space-y-4 rounded-t-lg bg-card p-5 shadow-xl sm:rounded-lg"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <h3 className="text-lg font-semibold">Delete {page.title}?</h3>
        <p className="text-sm">
          {below > 0 ? `This also deletes the ${below} ${below === 1 ? 'page' : 'pages'} under it. ` : ''}
          They come off the site for everyone. Their files are kept in the content repository, so an admin with access to it can bring them back.
        </p>
        {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
        {state.busy ? (
          <p role="status" className="text-sm text-muted">Deleting. It leaves the site in about 20 seconds…</p>
        ) : (
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-line px-4 py-2">
              Cancel
            </button>
            <button type="submit" className="rounded-md bg-red-700 px-4 py-2 text-white">
              Delete
            </button>
          </div>
        )}
      </form>
    </div>,
    document.body,
  )
}
