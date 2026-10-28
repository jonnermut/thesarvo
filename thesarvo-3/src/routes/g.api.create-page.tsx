import { createFileRoute } from '@tanstack/react-router'
import { pageAccess } from '#/auth/pageGuard'
import { requireEditor } from '#/auth/verifyToken'
import { addPage, parseAddPage } from '#/guide/save/addPage'
import { guideRepo } from '#/guide/save/repo'
import { Invalid } from '#/guide/save/validate'

const json = (body: unknown, status = 200) => Response.json(body, { status })

/**
 * `POST /g/api/create-page` with `{ parent, title, kind }` (see `src/guide/save/addPage.ts`): adds a new page as the last
 * child of `parent`, with an empty guide, in one commit. Any signed-in user. 200 with `{ id }`; the page is on the static
 * site once the publish that commit starts is done.
 */
export const Route = createFileRoute('/g/api/create-page')({
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
          body = parseAddPage(await request.json())
        } catch (e) {
          return json({ error: e instanceof Invalid ? e.message : 'Not JSON' }, 400)
        }
        const access = await pageAccess(editor, body.parent)
        if (access === 'denied') return json({ error: 'You do not have access to this page' }, 403)
        // A page added under a private one would be public, so for now they can only be added under public pages.
        if (access === 'allowed') return json({ error: 'Pages cannot be added under a private page yet' }, 400)
        try {
          const result = await addPage(repo, editor, body)
          if (result.status === 'missing') return json({ error: 'No such parent page' }, 400)
          // The dev server builds its tree from what it read once.
          if (process.env.NODE_ENV === 'development') (await import('#/guide/content/siteManifest')).resetSiteManifest()
          console.log(JSON.stringify({ addPage: result.id, parent: body.parent, by: editor.sub }))
          return json({ id: result.id })
        } catch (e) {
          console.error(e)
          return json({ error: 'Could not add the page' }, 502)
        }
      },
    },
  },
})
