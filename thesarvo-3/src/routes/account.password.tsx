import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { changePassword, signIn, useUser } from '#/auth/session'

/** The pool's rule (scripts/cognito-setup.sh): at least 8 characters, nothing else required. */
const MIN_LENGTH = 8

/** Change your password. A static page: the browser talks to Cognito directly. */
export const Route = createFileRoute('/account/password')({
  head: () => ({ meta: [{ title: 'Change password · thesarvo' }, { name: 'robots', content: 'noindex' }] }),
  component: ChangePassword,
})

const input = 'mt-1 w-full rounded-md border border-line bg-white px-3 py-2 focus:border-link focus:outline-none'

function ChangePassword() {
  const user = useUser()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [state, setState] = useState<{ busy?: boolean; error?: string; done?: boolean }>({})

  if (!user)
    return (
      <Page>
        <p className="mb-4">Sign in to change your password.</p>
        <button type="button" className="rounded-md bg-brand px-4 py-2 text-white" onClick={() => void signIn()}>
          Sign in
        </button>
      </Page>
    )
  if (!user.hasPassword)
    return (
      <Page>
        <p>You sign in with another account (such as Google), so there is no thesarvo password to change.</p>
      </Page>
    )
  if (state.done)
    return (
      <Page>
        <p className="mb-4">Your password has been changed.</p>
        <Link to="/g" className="text-link underline">
          Back to the guides
        </Link>
      </Page>
    )

  const problem =
    next.length > 0 && next.length < MIN_LENGTH ? `At least ${MIN_LENGTH} characters.` : again && next !== again ? 'The new passwords do not match.' : null

  return (
    <Page>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (problem || !current || !next) return
          setState({ busy: true })
          changePassword(current, next).then(
            () => setState({ done: true }),
            (err: unknown) => setState({ error: err instanceof Error ? err.message : 'Could not change the password' }),
          )
        }}
      >
        <p className="text-sm text-muted">{user.email}</p>
        {/* A hidden user name lets password managers file the new password under the right account. */}
        <input type="email" name="username" autoComplete="username" value={user.email} readOnly hidden />
        <label className="block">
          <span className="text-sm font-medium">Current password</span>
          <input className={input} type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">New password</span>
          <input className={input} type="password" autoComplete="new-password" required minLength={MIN_LENGTH} value={next} onChange={(e) => setNext(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">New password again</span>
          <input className={input} type="password" autoComplete="new-password" required value={again} onChange={(e) => setAgain(e.target.value)} />
        </label>
        {(problem ?? state.error) && <p className="text-sm text-red-700">{problem ?? state.error}</p>}
        <button type="submit" disabled={state.busy || !!problem} className="rounded-md bg-brand px-4 py-2 text-white disabled:opacity-50">
          {state.busy ? 'Changing…' : 'Change password'}
        </button>
      </form>
    </Page>
  )
}

const Page = ({ children }: { children: React.ReactNode }) => (
  <div className="mx-auto max-w-md p-6 sm:p-8">
    <h1 className="mb-4 text-2xl font-bold text-navy">Change password</h1>
    {children}
  </div>
)
