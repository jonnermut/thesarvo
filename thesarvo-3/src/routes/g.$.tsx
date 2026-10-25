import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { findByPath, guideUrl } from '#/guide/content/paths'
import { fetchGuide } from '#/guide/server'
import { GuideView } from '#/guide/view/GuideView'


export const Route = createFileRoute('/g/$')({
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
  if (guide) return <GuideView guide={guide} />
  // A plain page or region: list what is beneath it.
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold">{node.title}</h1>
      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {node.children.map((c) => (
          <li key={c.id}>
            <Link to={guideUrl(c)} className="block rounded-lg border border-line bg-card px-4 py-3 hover:border-amber">
              {c.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
