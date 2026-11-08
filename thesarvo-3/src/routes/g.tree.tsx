import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { RequireSignIn } from '#/auth/RequireSignIn'
import { useUser } from '#/auth/session'

// Its own chunk: readers never download it.
const TreeEditor = lazy(() => import('#/guide/tree/TreeEditor'))

export const Route = createFileRoute('/g/tree')({
  validateSearch: (search: Record<string, unknown>): { page?: string } => (typeof search.page === 'string' && /^\d+$/.test(search.page) ? { page: search.page } : {}),
  head: () => ({ meta: [{ title: 'Arrange pages · thesarvo' }, { name: 'robots', content: 'noindex' }] }),
  component: TreePage,
})

/** Admins only (the API checks the token too): the page tree, to rename pages and drag them into place. The static site builds this page once; the tree is read after sign-in. */
function TreePage() {
  const { page } = Route.useSearch()
  const user = useUser()
  return (
    <ClientOnly>
      <RequireSignIn what="arrange the pages">
      {user?.admin ? (
        <Suspense fallback={<p className="p-8 text-muted">Loading…</p>}>
          <TreeEditor selected={page} />
        </Suspense>
      ) : (
        <p className="p-8">Only admins can arrange the pages.</p>
      )}
      </RequireSignIn>
    </ClientOnly>
  )
}
