import { ClientOnly, Link, createFileRoute, notFound } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { findByPath, guideUrl } from '#/guide/content/paths'
import { fetchGuide } from '#/guide/server'
import { GuideView } from '#/guide/view/GuideView'

// The editor is its own chunk: readers never download it.
const Editor = lazy(() => import('#/guide/edit/Editor'))

export const Route = createFileRoute('/g/$')({
  // `?edit` switches the same address into the editor, so everything lives under /g.
  validateSearch: (search: Record<string, unknown>): { edit?: true } =>
    search.edit === true || search.edit === 'true' || search.edit === '' ? { edit: true } : {},
  loader: async ({ params, parentMatchPromise }) => {
    const index = (await parentMatchPromise).loaderData!
    const node = findByPath(index, decodeURIComponent(params._splat ?? ''))
    if (!node) throw notFound()
    return { node, guide: node.isGuide ? await fetchGuide({ data: node.id }) : null }
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.node.title ?? 'Guide'} · thesarvo` }] }),
  component: GuidePage,
  notFoundComponent: () => <p className="p-8">Page not found.</p>,
})

function GuidePage() {
  const { node, guide } = Route.useLoaderData()
  const { edit } = Route.useSearch()
  if (guide && edit)
    return (
      <ClientOnly fallback={<p className="p-8 text-muted">Loading editor…</p>}>
        <Suspense fallback={<p className="p-8 text-muted">Loading editor…</p>}>
          <Editor guide={guide} />
        </Suspense>
      </ClientOnly>
    )
  if (guide) return <GuideView guide={guide} />
  // A plain page or region: list what is beneath it.
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-[28px] font-bold text-navy">{node.title}</h1>
      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {node.children.map((c) => (
          <li key={c.id}>
            <Link to={guideUrl(c)} className="block border border-line bg-card px-4 py-3 text-navy hover:bg-paper">
              {c.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
