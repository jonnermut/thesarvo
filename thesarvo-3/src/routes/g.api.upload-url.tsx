import { createFileRoute } from '@tanstack/react-router'
import { guardPage, pageAccess } from '#/auth/pageGuard'
import { requireEditor } from '#/auth/verifyToken'
import { getFullContent } from '#/guide/content'
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
        if (!/^\d+$/.test(guide) || !(await getFullContent().all.getGuide(guide))) return json({ error: 'No such guide' }, 400)
        const denied = await guardPage(editor, guide)
        if (denied) return denied
        try {
          const ticket = await uploadTicket(store.bucket, store.creds, guide, String(body.name ?? ''), Number(body.size), (await pageAccess(editor, guide)) === 'allowed')
          console.log(JSON.stringify({ upload: `${guide}/${ticket.name}`, by: editor.email }))
          return json(ticket)
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : 'Upload failed' }, 400)
        }
      },
    },
  },
})
