import { ClientOnly, createFileRoute, notFound } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { findByPath } from '#/guide/content/paths'
import { fetchGuide } from '#/guide/server'

// The editor is its own chunk: readers never download it.
const Editor = lazy(() => import('#/guide/edit/Editor'))

export const Route = createFileRoute('/edit/$')({
  loader: async ({ params, parentMatchPromise }) => {
    const index = (await parentMatchPromise).loaderData!
    const node = findByPath(index, decodeURIComponent(params._splat ?? ''))
    const guide = node?.isGuide ? await fetchGuide({ data: node.id }) : null
    if (!node || !guide) throw notFound()
    return { node, guide }
  },
  head: ({ loaderData }) => ({ meta: [{ title: `Edit ${loaderData?.node.title ?? ''} · thesarvo` }] }),
  component: EditPage,
  notFoundComponent: () => <p className="p-8">No guide at this address.</p>,
})

function EditPage() {
  const { guide } = Route.useLoaderData()
  return (
    <ClientOnly fallback={<p className="p-8 text-muted">Loading editor…</p>}>
      <Suspense fallback={<p className="p-8 text-muted">Loading editor…</p>}>
        <Editor guide={guide} />
      </Suspense>
    </ClientOnly>
  )
}
