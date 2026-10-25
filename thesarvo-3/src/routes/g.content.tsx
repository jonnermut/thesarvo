import { createFileRoute } from '@tanstack/react-router'
import { getContentSource } from '#/guide/content'

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  kml: 'application/vnd.google-earth.kml+xml',
}

/** Serves images from the content source. Development stand-in for object storage + CDN. */
export const Route = createFileRoute('/g/content')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // A query parameter rather than a path: dev servers treat paths ending in .jpg as static files.
        const name = new URL(request.url).searchParams.get('f') ?? ''
        const body = await getContentSource().readFile(name)
        if (!body) return new Response('Not found', { status: 404 })
        const type = TYPES[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream'
        return new Response(new Uint8Array(body), { headers: { 'content-type': type, 'cache-control': 'public, max-age=3600' } })
      },
    },
  },
})
