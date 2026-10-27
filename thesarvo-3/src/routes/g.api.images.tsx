import { createFileRoute } from '@tanstack/react-router'
import { bucketImageNames, imageBucket } from '#/guide/content/bucketImages'

/** `GET /g/api/images?guide=<id>`: every photo stored for the guide, including ones no page uses yet. Public. */
export const Route = createFileRoute('/g/api/images')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const store = imageBucket()
        if (!store) return Response.json({ error: 'Not set up here' }, { status: 501 })
        const guide = new URL(request.url).searchParams.get('guide') ?? ''
        if (!/^\d+$/.test(guide)) return Response.json({ error: 'No such guide' }, { status: 400 })
        return Response.json(await bucketImageNames(store.bucket, store.creds, guide), { headers: { 'cache-control': 'no-store' } })
      },
    },
  },
})
