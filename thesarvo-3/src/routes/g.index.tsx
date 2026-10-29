import { createFileRoute } from '@tanstack/react-router'
import type { IndexNode } from '#/guide/content/types'
import { pageHead, pageDescription } from '#/guide/seo'
import { fetchPage } from '#/guide/server'
import { ContentsView } from '#/guide/view/ContentsView'
import { ForumFeed } from '#/forum/ui/ForumFeed'
import { Notices } from '#/forum/ui/Notices'
import { HomeCards } from '#/guide/view/HomeCards'
import { WhatsNew } from '#/guide/view/WhatsNew'

export const Route = createFileRoute('/g/')({
  loader: async () => (await fetchPage(''))!,
  head: ({ loaderData }) =>
    pageHead({
      title: 'thesarvo · Tasmanian climbing guides',
      description: loaderData ? pageDescription({ ...loaderData.node, title: 'Tasmanian climbing guides' }, null) : '',
      path: '',
    }),
  component: Home,
})

function Home() {
  const { node: index } = Route.useLoaderData()
  return (
    <div>
      <Hero index={index} />
      <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="max-w-4xl">
          <Notices />
          <HomeCards />
          <ContentsView node={index} />
          <WhatsNew />
          <ForumFeed />
        </div>
      </div>
    </div>
  )
}

function Hero({ index }: { index: IndexNode }) {
  // Totals only: the tree the page is built with stops short of the deepest guides.
  const facts = [
    [index.count, 'climbs'],
    [index.guides, 'guides'],
  ] as const
  return (
    <section className="relative overflow-hidden bg-brand text-white">
      <Contours />
      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">Tasmanian climbing guides</h1>
        <p className="mt-4 max-w-xl text-lg text-pretty text-white/75">Free, community-written guides to the crags and boulders of Tasmania.</p>
        <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
          {facts.map(
            ([n, label]) =>
              !!n && (
                <div key={label} className="flex flex-col-reverse">
                  <dt className="text-sm text-white/60">{label}</dt>
                  <dd className="text-3xl font-bold text-amber tabular-nums">{n.toLocaleString('en-AU')}</dd>
                </div>
              ),
          )}
        </dl>
      </div>
    </section>
  )
}

/** Contour lines round two summits, like a topographic map, drawn behind the hero text on the right. */
function Contours() {
  return (
    <svg viewBox="0 0 1200 400" preserveAspectRatio="xMaxYMid slice" className="pointer-events-none absolute inset-0 size-full text-white/10" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        {CONTOURS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  )
}

// Fixed at module load and rounded, so the server and the browser draw the same paths.
const CONTOURS = [
  { x: 960, y: 170, rings: 11, phase: 0.4 },
  { x: 720, y: 360, rings: 7, phase: 2.1 },
].flatMap(({ x, y, rings, phase }) =>
  Array.from({ length: rings }, (_, i) => {
    const r = 18 + i * 26
    const points = Array.from({ length: 72 }, (__, k) => {
      const a = (k / 72) * Math.PI * 2
      const wobble = 1 + 0.16 * Math.sin(3 * a + phase + i * 0.25) + 0.07 * Math.sin(5 * a - phase * 2 + i * 0.4)
      return `${(x + Math.cos(a) * r * wobble * 1.35).toFixed(1)},${(y + Math.sin(a) * r * wobble).toFixed(1)}`
    })
    return `M${points.join('L')}Z`
  }),
)
