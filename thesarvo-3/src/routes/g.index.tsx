import { Link, createFileRoute } from '@tanstack/react-router'
import { guideUrl } from '#/guide/content/paths'
import { fetchPage } from '#/guide/server'

export const Route = createFileRoute('/g/')({
  loader: async () => (await fetchPage(''))!,
  component: Home,
})

function Home() {
  const { node: index } = Route.useLoaderData()
  return (
    <div>
      <section className="bg-forest px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold">Tasmanian climbing guides</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/75">Free, community-written guides to the crags and boulders of Tasmania. Pick a region to start.</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-5xl gap-4 px-6 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {index.children.map((region) => (
          <Link
            key={region.id}
            to={guideUrl(region)}
            className="group border border-line bg-card p-4 transition hover:bg-paper"
          >
            <h2 className="text-xl font-semibold text-navy">{region.title}</h2>
            <p className="mt-1 text-sm text-muted">{region.count ? `${region.count.toLocaleString()} climbs` : 'Information'}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
