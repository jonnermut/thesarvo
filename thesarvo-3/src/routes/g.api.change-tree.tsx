import { createFileRoute } from '@tanstack/react-router'
import { requireEditor } from '#/auth/verifyToken'
import { changeTree, parseTreeChange } from '#/guide/save/moveTree'
import { guideRepo } from '#/guide/save/repo'
import { Invalid } from '#/guide/save/validate'

const json = (body: unknown, status = 200) => Response.json(body, { status })

/**
 * `POST /g/api/change-tree` with `{ action: 'rename', page, title }`, `{ action: 'move', page, parent, position }` or `{ action: 'restore', index }`
 * (undo; see `src/guide/save/moveTree.ts`): renames a page, moves it with the pages under it, or puts an earlier tree back, in one commit.
 * Admins only. `GET` answers `{ index, moved }`, the stored tree (every page, private ones too) and the old addresses that redirect. 200 with `{ before }`, the tree before (to undo with); the static site follows once the publish that commit starts is done.
 */
export const Route = createFileRoute('/g/api/change-tree')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const editor = await requireEditor(request, 'admins')
        if (editor instanceof Response) return editor
        const repo = await guideRepo()
        if (!repo) return json({ error: 'Saving is not set up here' }, 501)
        try {
          const { index, moved } = await repo.readIndex()
          return json({ index, moved })
        } catch (e) {
          console.error(e)
          return json({ error: 'Could not read the page tree' }, 502)
        }
      },
      POST: async ({ request }) => {
        // Never 404: CloudFront turns 404s into the guide home page.
        const editor = await requireEditor(request, 'admins')
        if (editor instanceof Response) return editor
        const repo = await guideRepo()
        if (!repo) return json({ error: 'Saving is not set up here' }, 501)
        let body
        try {
          body = parseTreeChange(await request.json())
        } catch (e) {
          return json({ error: e instanceof Invalid ? e.message : 'Not JSON' }, 400)
        }
        try {
          const result = await changeTree(repo, editor, body)
          if (result.status === 'forbidden') return json({ error: 'Not allowed' }, 403)
          if (result.status === 'invalid') return json({ error: result.error }, 400)
          // The dev server builds its tree from what it read once.
          if (process.env.NODE_ENV === 'development') (await import('#/guide/content/siteManifest')).resetSiteManifest()
          console.log(JSON.stringify({ changeTree: body.action, by: editor.sub }))
          return json({ before: result.before })
        } catch (e) {
          console.error(e)
          return json({ error: 'Could not change the page tree' }, 502)
        }
      },
    },
  },
})
