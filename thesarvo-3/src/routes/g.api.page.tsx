import { createFileRoute } from '@tanstack/react-router'
import { guardPage } from '#/auth/pageGuard'
import { requireEditor } from '#/auth/verifyToken'
import { MAX_HTML } from '#/rte/sanitize'
import { guideRepo } from '#/guide/save/repo'
import { savePageBody } from '#/guide/save/saveBody'

const json = (body: unknown, status = 200) => Response.json(body, { status })
const ID = /^\d+$/
const SESSION = /^[\w-]{1,64}$/

/**
 * A prose page's HTML (the pages that are not guides). `GET /g/api/page?id=349798603` gives `{ head, html }` as last saved, for the editor to start from.
 * `POST` with `{ page, session, base, html, title?, note? }` saves it: sanitised, committed with its history like a guide save. Any signed-in user.
 * 200 with the saved HTML, or 409 with the page as it is now when someone saved since `base` was read.
 */
export const Route = createFileRoute('/g/api/page')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Never 404: CloudFront turns 404s into the guide home page.
        const editor = await requireEditor(request)
        if (editor instanceof Response) return editor
        const repo = await guideRepo()
        if (!repo) return json({ error: 'Saving is not set up here' }, 501)
        const id = new URL(request.url).searchParams.get('id') ?? ''
        if (!ID.test(id)) return json({ error: 'No such page' }, 400)
        const denied = await guardPage(editor, id)
        if (denied) return denied
        try {
          const stored = await repo.readBody(id)
          return stored ? json({ head: stored.head, html: stored.html }) : json({ error: 'No such page' }, 400)
        } catch (e) {
          console.error(e)
          return json({ error: 'Could not read the page' }, 502)
        }
      },
      POST: async ({ request }) => {
        const editor = await requireEditor(request)
        if (editor instanceof Response) return editor
        const repo = await guideRepo()
        if (!repo) return json({ error: 'Saving is not set up here' }, 501)
        const b = (await request.json().catch(() => null)) as Record<string, unknown> | null
        const { page, session, base, html, title, note } = b ?? {}
        if (typeof page !== 'string' || !ID.test(page) || typeof session !== 'string' || !SESSION.test(session) || typeof base !== 'string' || typeof html !== 'string') return json({ error: 'Not a page save' }, 400)
        if (html.length > MAX_HTML) return json({ error: 'The page is too long' }, 400)
        const denied = await guardPage(editor, page)
        if (denied) return denied
        try {
          const result = await savePageBody(repo, editor, {
            page, session, base, html,
            ...(typeof title === 'string' && { title: title.slice(0, 120) }),
            ...(typeof note === 'string' && { note: note.slice(0, 500) }),
          })
          if (result.status === 'missing') return json({ error: 'No such page' }, 400)
          console.log(JSON.stringify({ save: page, session, by: editor.sub, status: result.status }))
          return json(result, result.status === 'conflict' ? 409 : 200)
        } catch (e) {
          console.error(e)
          return json({ error: 'Could not save. Your changes are kept in this browser.' }, 502)
        }
      },
    },
  },
})
