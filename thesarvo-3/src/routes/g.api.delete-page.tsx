import { createFileRoute } from '@tanstack/react-router'
import { requireEditor } from '#/auth/verifyToken'
import { deletePage, parseDeletePage } from '#/guide/save/deletePage'
import { guideRepo } from '#/guide/save/repo'
import { Invalid } from '#/guide/save/validate'

const json = (body: unknown, status = 200) => Response.json(body, { status })

/**
 * `POST /g/api/delete-page` with `{ page }` (see `src/guide/save/deletePage.ts`): takes the page and the pages under it out of the page tree, in one commit.
 * Admins only (the Cognito group `admins`). 200 with `{ ids }`, the pages removed; the static site drops them once the publish that commit starts is done.
 */
export const Route = createFileRoute('/g/api/delete-page')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Never 404: CloudFront turns 404s into the guide home page.
        const editor = await requireEditor(request, 'admins')
        if (editor instanceof Response) return editor
        const repo = await guideRepo()
        if (!repo) return json({ error: 'Saving is not set up here' }, 501)
        let body
        try {
          body = parseDeletePage(await request.json())
        } catch (e) {
          return json({ error: e instanceof Invalid ? e.message : 'Not JSON' }, 400)
        }
        try {
          const result = await deletePage(repo, editor, body)
          if (result.status === 'forbidden') return json({ error: 'Not allowed' }, 403)
          if (result.status === 'missing') return json({ error: 'No such page' }, 400)
          // The dev server builds its tree from what it read once.
          if (process.env.NODE_ENV === 'development') (await import('#/guide/content/siteManifest')).resetSiteManifest()
          console.log(JSON.stringify({ deletePage: result.ids, by: editor.sub }))
          return json({ ids: result.ids })
        } catch (e) {
          console.error(e)
          return json({ error: 'Could not delete the page' }, 502)
        }
      },
    },
  },
})
