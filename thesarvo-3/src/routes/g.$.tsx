import { ClientOnly, createFileRoute, notFound, useLocation } from '@tanstack/react-router'
import { lazy, Suspense, useEffect } from 'react'
import { RequireSignIn } from '#/auth/RequireSignIn'
import { signIn, useUser } from '#/auth/session'
import { Breadcrumbs } from '#/components/Breadcrumbs'
import { fetchGuide, fetchPage, fetchPageBody } from '#/guide/server'
import { ContentsView, contentsTotals } from '#/guide/view/ContentsView'
import { useJustSaved } from '#/guide/justSaved'
import { addRecent } from '#/guide/recent'
import { guideDescription, guideImage, pageDescription, pageHead } from '#/guide/seo'
import { GuideView } from '#/guide/view/GuideView'
import { PrevNext } from '#/guide/view/PrevNext'
import { useFullWidth, WidthToggle, widthClass } from '#/guide/view/width'
import { WEATHER_PAGE_ID } from '#/weather/places'
import { WeatherPanel } from '#/weather/WeatherPanel'

// The editor is its own chunk: readers never download it. The history too, until someone opens it.
const Editor = lazy(() => import('#/guide/edit/Editor'))
const HistoryView = lazy(() => import('#/guide/history/HistoryView'))

/** What the address shows of a page: the page, `?edit` the editor, `?history` its history. */
export type PageMode = { edit?: true; history?: true }
const flag = (v: unknown) => v === true || v === 'true' || v === ''

export const Route = createFileRoute('/g/$')({
  // `?edit` and `?history` switch the same address into the editor or the history, so everything lives under /g.
  validateSearch: (search: Record<string, unknown>): PageMode => (flag(search.edit) ? { edit: true } : flag(search.history) ? { history: true } : {}),
  loader: async ({ params }) => {
    const page = await fetchPage(decodeURIComponent(params._splat ?? '').replace(/\/$/, ''))
    if (!page) throw notFound()
    const { id, isGuide } = page.node
    const [guide, body] = await Promise.all([isGuide ? fetchGuide({ data: id }) : null, isGuide ? null : fetchPageBody(id)])
    return { ...page, guide, body }
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: 'Guide · thesarvo' }] }
    const { node, guide, body } = loaderData
    return pageHead({
      title: `${node.title} · thesarvo`,
      description: guide ? guideDescription(guide, node) : pageDescription(node, body),
      path: node.path,
      image: guide ? guideImage(guide) : undefined,
    })
  },
  component: GuidePage,
  notFoundComponent: NotFound,
})

/** A path that is not in the tree: for someone signed out it may be a private page, which only shows once they sign in. */
function NotFound() {
  const user = useUser()
  return (
    <div className="p-8">
      <p>Page not found.</p>
      {user ? (
        <p className="mt-2 text-muted">If you expected a members-only page, you may not have access to it. Ask a committee member to add you to the group.</p>
      ) : (
        <p className="mt-2 text-muted">
          Some pages are for members only.{' '}
          <button type="button" className="font-semibold text-navy underline" onClick={() => void signIn()}>
            Sign in
          </button>{' '}
          to see them.
        </p>
      )}
    </div>
  )
}

function GuidePage() {
  const { node, trail, guide: published, body } = Route.useLoaderData()
  const guide = useJustSaved(published)
  const { edit, history } = Route.useSearch()
  const hash = useLocation({ select: (l) => l.hash })
  const full = useFullWidth()
  const width = widthClass(full)
  useEffect(() => {
    if (guide) addRecent({ path: node.path, title: node.title })
  }, [guide, node.path, node.title])
  if (guide && edit)
    return (
      <ClientOnly fallback={<p className="p-8 text-muted">Loading editor…</p>}>
        {/* Outside the lazy editor, so signed-out visitors never download it. */}
        <RequireSignIn what="edit this guide">
          <Suspense fallback={<p className="p-8 text-muted">Loading editor…</p>}>
            <Editor guide={guide} />
          </Suspense>
        </RequireSignIn>
      </ClientOnly>
    )
  if (history)
    return (
      <>
        <Breadcrumbs trail={trail} current={node} width="max-w-4xl px-4 sm:px-6" />
        <ClientOnly fallback={<p className="p-8 text-muted">Loading history…</p>}>
          <Suspense fallback={<p className="p-8 text-muted">Loading history…</p>}>
            <HistoryView node={node} guide={guide} hash={hash} />
          </Suspense>
        </ClientOnly>
      </>
    )
  // Breadcrumbs line up with the page body beneath them. A guide with pages below it lists them after the guide.
  if (guide)
    return (
      <>
        <Breadcrumbs trail={trail} current={node} width={`${width} px-4 sm:px-6`} end={<WidthToggle />} />
        {/* Keyed per guide: moving between guides starts afresh, so maps fit the new guide's points. */}
        <GuideView key={node.id} guide={guide} hash={hash} full={full} />
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
  const totals = contentsTotals(node)
  return (
    <>
      <Breadcrumbs trail={trail} current={node} width="max-w-4xl px-4 sm:px-6" />
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-line">
          <h1 className="text-[28px] font-bold text-navy">{node.title}</h1>
          {!node.isGuide && totals && <p className="text-sm text-muted">{totals}</p>}
        </div>
        {/* Cleaned and allow-listed when synced (see pageBody). */}
        {node.id === WEATHER_PAGE_ID && (
          <ClientOnly fallback={null}>
            <WeatherPanel />
          </ClientOnly>
        )}
        {body && <div className="page-prose mt-4" dangerouslySetInnerHTML={{ __html: body }} />}
        <ContentsView node={node} />
      </div>
    </>
  )
}
