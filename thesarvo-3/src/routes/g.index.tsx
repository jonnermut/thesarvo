import { createFileRoute } from '@tanstack/react-router'
import { fetchPage } from '#/guide/server'
import { ContentsView } from '#/guide/view/ContentsView'

export const Route = createFileRoute('/g/')({
  loader: async () => (await fetchPage(''))!,
  component: Home,
})

function Home() {
  const { node: index } = Route.useLoaderData()
  return (
    <div>
      <section className="bg-brand px-4 py-10 text-white sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold">Tasmanian climbing guides</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/75">Free, community-written guides to the crags and boulders of Tasmania. Pick a region to start.</p>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="max-w-4xl">
          <ContentsView node={index} />
        </div>
      </div>
    </div>
  )
}
