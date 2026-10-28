import { createFileRoute } from '@tanstack/react-router'
import { guardPage } from '#/auth/pageGuard'
import { requireEditor } from '#/auth/verifyToken'
import { guideRepo } from '#/guide/save/repo'
import { saveGuide } from '#/guide/save/save'
import { Invalid, parseSaveRequest } from '#/guide/save/validate'

const json = (body: unknown, status = 200) => Response.json(body, { status })

/**
 * `POST /g/api/save` with `{ guide, session, changes, note? }` (see `src/guide/save`): merges an editor's changes
 * into the guide and commits them. Any signed-in user. 200 with the saved guide, or 409 with the conflicts and the
 * guide as it is.
 */
export const Route = createFileRoute('/g/api/save')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Never 404: CloudFront turns 404s into the guide home page.
        const editor = await requireEditor(request)
        if (editor instanceof Response) return editor
        const repo = await guideRepo()
        if (!repo) return json({ error: 'Saving is not set up here' }, 501)
        let body
        try {
          body = parseSaveRequest(await request.json(), 'request')
        } catch (e) {
          return json({ error: e instanceof Invalid ? e.message : 'Not JSON' }, 400)
        }
        const denied = await guardPage(editor, body.guide)
        if (denied) return denied
        try {
          const result = await saveGuide(repo, editor, body)
          if (result.status === 'missing') return json({ error: 'No such guide' }, 400)
          console.log(JSON.stringify({ save: body.guide, session: body.session, by: editor.sub, status: result.status, nodes: body.changes.nodes.length }))
          return json(result, result.status === 'conflict' ? 409 : 200)
        } catch (e) {
          console.error(e)
          return json({ error: 'Could not save. Your changes are kept in this browser.' }, 502)
        }
      },
    },
  },
})
