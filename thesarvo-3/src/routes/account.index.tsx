import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { nextPath } from '#/auth/paths'
import { signIn, useUser } from '#/auth/session'
import { AvatarForm } from '#/components/AvatarForm'
import { NameForm } from '#/components/NameForm'

/**
 * Account settings: your name, and a link to change your password. The sign-in callback sends people here first
 * when their account has no name, with `then` to go on to; that visit asks for the name alone.
 */
export const Route = createFileRoute('/account/')({
  head: () => ({ meta: [{ title: 'Account settings · thesarvo' }, { name: 'robots', content: 'noindex' }] }),
  validateSearch: (search: Record<string, unknown>): { then?: string } => {
    const then = nextPath(search.then)
    return then ? { then } : {}
  },
  component: AccountSettings,
})

function AccountSettings() {
  const user = useUser()
  const { then } = Route.useSearch()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)

  if (!user)
    return (
      <Page title="Account settings">
        <p className="mb-4">Sign in to see your account settings.</p>
        <button type="button" className="rounded-md bg-brand px-4 py-2 text-white" onClick={() => void signIn()}>
          Sign in
        </button>
      </Page>
    )
  if (then)
    return (
      <Page title="Your name">
        <p className="mb-4">Welcome. Please tell us your name.</p>
        <NameForm submit="Continue" onSaved={() => void navigate({ href: then, replace: true })} />
      </Page>
    )
  return (
    <Page title="Account settings">
      <p className="mb-6 text-sm text-muted">{user.email}</p>
      <AvatarForm />
      <NameForm onSaved={() => setSaved(true)} />
      {saved && <p className="mt-2 text-sm text-muted">Saved.</p>}
      {user.hasPassword && (
        <section className="mt-8 border-t border-line pt-6">
          <h2 className="mb-2 font-semibold">Password</h2>
          <Link to="/account/password" className="text-link underline">
            Change your password
          </Link>
        </section>
      )}
    </Page>
  )
}

const Page = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mx-auto max-w-md p-6 sm:p-8">
    <h1 className="mb-4 text-2xl font-bold text-navy">{title}</h1>
    {children}
  </div>
)
