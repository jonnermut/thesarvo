import { createFileRoute } from '@tanstack/react-router'
import { guardPage, pageAccess } from '#/auth/pageGuard'
import { requireEditor } from '#/auth/verifyToken'
import { getFullContent } from '#/guide/content'
import { forumUploadTicket, imageBucket, uploadTicket } from '#/guide/content/bucketImages'

const json = (body: unknown, status = 200) => Response.json(body, { status })

/**
 * `POST /g/api/upload-url` with `{ guide, name, size }`: a presigned form the browser posts one photo
 * to, straight into the bucket. Any signed-in user; the guide (or prose page) must exist. `guide: 'forum:<thread>'` is for a forum post's pictures (members only, never public).
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
        const forum = /^forum:([\w-]{1,40})$/.exec(guide)?.[1]
        if (forum) {
          try {
            const ticket = await forumUploadTicket(store.bucket, store.creds, forum, String(body.name ?? ''), Number(body.size))
            console.log(JSON.stringify({ upload: `forum/${forum}/${ticket.name}`, by: editor.email }))
            return json(ticket)
          } catch (e) {
            return json({ error: e instanceof Error ? e.message : 'Upload failed' }, 400)
          }
        }
        const all = getFullContent().all
        if (!/^\d+$/.test(guide) || !((await all.getGuide(guide)) || (await all.getPageBody(guide)))) return json({ error: 'No such guide' }, 400)
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
