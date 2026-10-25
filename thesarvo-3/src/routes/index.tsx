import { Link, createFileRoute, getRouteApi } from '@tanstack/react-router'
import { guideUrl } from '#/guide/content/paths'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const index = root.useLoaderData()
  return (
    <div>
      <section className="bg-forest-soft px-6 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Tasmanian climbing guides</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/75">Free, community-written guides to the crags and boulders of Tasmania. Pick a region to start.</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-5xl gap-4 px-6 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {index.children.map((region) => (
          <Link
            key={region.id}
            to={guideUrl(region)}
            className="group rounded-xl border border-line bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-amber hover:shadow-md"
          >
            <h2 className="font-display text-xl font-semibold group-hover:text-amber-deep">{region.title}</h2>
            <p className="mt-1 text-sm text-muted">{region.children.length ? `${region.children.length} areas` : 'Guide'}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
