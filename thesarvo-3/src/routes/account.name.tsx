import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { nextPath } from '#/auth/paths'
import { signIn, useUser } from '#/auth/session'
import { NameForm } from '#/components/NameForm'

/** Set your name. The sign-in callback sends people here first when their account has none, with `then` to go on to. */
export const Route = createFileRoute('/account/name')({
  head: () => ({ meta: [{ title: 'Your name · thesarvo' }, { name: 'robots', content: 'noindex' }] }),
  validateSearch: (search: Record<string, unknown>): { then?: string } => {
    const then = nextPath(search.then)
    return then ? { then } : {}
  },
  component: YourName,
})

function YourName() {
  const user = useUser()
  const { then } = Route.useSearch()
  const navigate = useNavigate()
  const [done, setDone] = useState(false)

  if (!user)
    return (
      <Page>
        <p className="mb-4">Sign in to set your name.</p>
        <button type="button" className="rounded-md bg-brand px-4 py-2 text-white" onClick={() => void signIn()}>
          Sign in
        </button>
      </Page>
    )
  if (done)
    return (
      <Page>
        <p className="mb-4">Your name is now {user.name}.</p>
        <Link to="/g" className="text-link underline">
          Back to the guides
        </Link>
      </Page>
    )
  return (
    <Page>
      {!user.name && <p className="mb-4">Welcome. Please tell us your name.</p>}
      <p className="mb-4 text-sm text-muted">{user.email}</p>
      <NameForm submit={then ? 'Continue' : 'Save'} onSaved={() => (then ? void navigate({ href: then, replace: true }) : setDone(true))} />
    </Page>
  )
}

const Page = ({ children }: { children: React.ReactNode }) => (
  <div className="mx-auto max-w-md p-6 sm:p-8">
    <h1 className="mb-4 text-2xl font-bold text-navy">Your name</h1>
    {children}
  </div>
)
