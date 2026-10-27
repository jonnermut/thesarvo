import { useEffect, useRef } from 'react'
import { signIn, useUser } from '#/auth/session'
import { NameForm } from '#/components/NameForm'

/**
 * Shows its children only to a signed-in user with a name; one without gives their name first. Anyone else arriving here is sent straight to sign in and comes back
 * to the same address; someone who signs out while here sees a Sign in button instead. Render it client-side only
 * (inside `ClientOnly`): while hydrating, `useUser` is always null.
 */
export function RequireSignIn({ what, children }: { what: string; children: React.ReactNode }) {
  const user = useUser()
  const signedInAtStart = useRef(!!user)
  useEffect(() => {
    if (!signedInAtStart.current) void signIn()
  }, [])
  if (user?.name) return children
  if (user)
    return (
      <div className="mx-auto max-w-md p-6 sm:p-8">
        <p className="mb-4">Before you {what}, please tell us your name.</p>
        {/* Saving refreshes the token, so the name arrives through useUser and the children show. */}
        <NameForm submit="Continue" onSaved={() => {}} />
      </div>
    )
  return (
    <div className="mx-auto max-w-md p-6 sm:p-8">
      <p className="mb-4">Sign in to {what}.</p>
      <button type="button" className="rounded-md bg-brand px-4 py-2 text-white" onClick={() => void signIn()}>
        Sign in
      </button>
    </div>
  )
}
