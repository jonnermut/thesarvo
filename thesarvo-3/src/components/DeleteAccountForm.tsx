import { useState } from 'react'
import { call } from '#/auth/apiCall'
import { signOut } from '#/auth/session'

/** Deletes the signed-in account (`/g/api/delete-account`), after asking once more; then signs out. Required by the app stores. */
export function DeleteAccountForm() {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function remove() {
    setBusy(true)
    setError('')
    const answer = await call('delete-account', { method: 'POST', body: JSON.stringify({ confirm: 'delete' }) })
    if (answer.ok) return signOut()
    setBusy(false)
    setError(answer.message)
  }

  return (
    <section className="mt-8 border-t border-line pt-6">
      <h2 className="mb-2 font-semibold">Delete account</h2>
      {asking ? (
        <>
          <p className="mb-3 text-sm">
            This deletes your sign-in for good. Pages you edited and forum posts stay under your name. See the{' '}
            <a href="/g/more/app-privacy-policy/" className="text-link underline">privacy policy</a>.
          </p>
          <div className="flex gap-3">
            <button type="button" disabled={busy} className="rounded-md bg-red-700 px-4 py-2 text-white disabled:opacity-60" onClick={() => void remove()}>
              {busy ? 'Deleting…' : 'Delete my account'}
            </button>
            <button type="button" disabled={busy} className="rounded-md border border-line px-4 py-2" onClick={() => setAsking(false)}>
              Cancel
            </button>
          </div>
          {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        </>
      ) : (
        <button type="button" className="text-link underline" onClick={() => setAsking(true)}>
          Delete your account
        </button>
      )}
    </section>
  )
}
