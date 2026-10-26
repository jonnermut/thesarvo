import { ClientOnly, createFileRoute, notFound, useLocation } from '@tanstack/react-router'
import { lazy, Suspense, useEffect } from 'react'
import { Breadcrumbs } from '#/components/Breadcrumbs'
import { fetchGuide, fetchPage, fetchPageBody } from '#/guide/server'
import { ContentsView } from '#/guide/view/ContentsView'
import { addRecent } from '#/guide/recent'
import { GuideView } from '#/guide/view/GuideView'
import { PrevNext } from '#/guide/view/PrevNext'
import { useFullWidth, WidthToggle, widthClass } from '#/guide/view/width'

// The editor is its own chunk: readers never download it.
const Editor = lazy(() => import('#/guide/edit/Editor'))

export const Route = createFileRoute('/g/$')({
  // `?edit` switches the same address into the editor, so everything lives under /g.
  validateSearch: (search: Record<string, unknown>): { edit?: true } =>
    search.edit === true || search.edit === 'true' || search.edit === '' ? { edit: true } : {},
  loader: async ({ params }) => {
    const page = await fetchPage(decodeURIComponent(params._splat ?? '').replace(/\/$/, ''))
    if (!page) throw notFound()
    const { id, isGuide } = page.node
    const [guide, body] = await Promise.all([isGuide ? fetchGuide({ data: id }) : null, isGuide ? null : fetchPageBody(id)])
    return { ...page, guide, body }
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.node.title ?? 'Guide'} · thesarvo` }],
  }),
  component: GuidePage,
  notFoundComponent: () => <p className="p-8">Page not found.</p>,
})

function GuidePage() {
  const { node, trail, guide, body } = Route.useLoaderData()
  const { edit } = Route.useSearch()
  const hash = useLocation({ select: (l) => l.hash })
  const full = useFullWidth()
  const width = widthClass(full)
  useEffect(() => {
    if (guide) addRecent({ path: node.path, title: node.title })
  }, [guide, node.path, node.title])
  if (guide && edit)
    return (
      <ClientOnly fallback={<p className="p-8 text-muted">Loading editor…</p>}>
        <Suspense fallback={<p className="p-8 text-muted">Loading editor…</p>}>
          <Editor guide={guide} />
        </Suspense>
      </ClientOnly>
    )
  // Breadcrumbs line up with the page body beneath them. A guide with pages below it lists them after the guide.
  if (guide)
    return (
      <>
        <Breadcrumbs trail={trail} current={node} width={`${width} px-4 sm:px-6`} end={<WidthToggle />} />
        <GuideView guide={guide} hash={hash} full={full} />
        <PrevNext id={node.id} width={width} />
        {node.children.length > 0 && (
          <div className={`mx-auto ${width} px-4 pb-10 sm:px-6`}>
            <div className="max-w-4xl">
              <ContentsView node={node} />
            </div>
          </div>
        )}
      </>
    )
  // A page of prose, a list of what is beneath it, or both.
  return (
    <>
      <Breadcrumbs trail={trail} current={node} width="max-w-4xl px-4 sm:px-6" />
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <h1 className="border-b border-line text-[28px] font-bold text-navy">{node.title}</h1>
        {/* Cleaned and allow-listed when synced (see pageBody). */}
        {body && <div className="page-prose mt-4" dangerouslySetInnerHTML={{ __html: body }} />}
        <ContentsView node={node} />
      </div>
    </>
  )
}
