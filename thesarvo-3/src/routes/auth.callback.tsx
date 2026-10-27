import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { NAME_PATH } from '#/auth/paths'
import { completeSignIn, currentUser, signIn } from '#/auth/session'

/** Where Cognito's login page sends the browser back to. A static page: the sign-in finishes in the browser. */
export const Route = createFileRoute('/auth/callback')({
  head: () => ({ meta: [{ title: 'Signing in · thesarvo' }, { name: 'robots', content: 'noindex' }] }),
  component: Callback,
})

function Callback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    completeSignIn(new URL(location.href))
      // Someone without a name (a new account) gives one first.
      .then((to) => navigate({ href: currentUser()?.name ? to : `${NAME_PATH}?${new URLSearchParams({ then: to })}`, replace: true }))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Sign-in failed'))
  }, [navigate])

  return (
    <div className="mx-auto max-w-md p-8 text-center">
      {error ? (
        <>
          <p className="mb-4 text-red-700">{error}</p>
          <button type="button" className="rounded-md bg-brand px-4 py-2 text-white" onClick={() => void signIn('/g')}>
            Sign in again
          </button>
        </>
      ) : (
        <p className="text-muted">Signing in…</p>
      )}
    </div>
  )
}
