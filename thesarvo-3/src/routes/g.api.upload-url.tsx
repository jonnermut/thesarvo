import { createFileRoute } from '@tanstack/react-router'
import { requireEditor } from '#/auth/verifyToken'
import { getContentSource } from '#/guide/content'
import { imageBucket, uploadTicket } from '#/guide/content/bucketImages'

const json = (body: unknown, status = 200) => Response.json(body, { status })

/**
 * `POST /g/api/upload-url` with `{ guide, name, size }`: a presigned form the browser posts one photo
 * to, straight into the bucket. Any signed-in user; the guide must exist.
 */
export const Route = createFileRoute('/g/api/upload-url')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Never 404: CloudFront turns 404s into the guide home page.
        const editor = await requireEditor(request)
        if (editor instanceof Response) return editor
        const store = imageBucket()
        if (!store) return json({ error: 'Uploads are not set up here' }, 501)
        const body = (await request.json().catch(() => ({}))) as { guide?: unknown; name?: unknown; size?: unknown }
        const guide = String(body.guide ?? '')
        if (!/^\d+$/.test(guide) || !(await getContentSource().getGuide(guide))) return json({ error: 'No such guide' }, 400)
        try {
          const ticket = await uploadTicket(store.bucket, store.creds, guide, String(body.name ?? ''), Number(body.size))
          console.log(JSON.stringify({ upload: `${guide}/${ticket.name}`, by: editor.email }))
          return json(ticket)
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : 'Upload failed' }, 400)
        }
      },
    },
  },
})
