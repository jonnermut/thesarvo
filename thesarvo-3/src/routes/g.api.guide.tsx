import { createFileRoute } from '@tanstack/react-router'
import { requireEditor } from '#/auth/verifyToken'
import { guideRepo } from '#/guide/save/repo'

const json = (body: unknown, status = 200) => Response.json(body, { status })

/**
 * `GET /g/api/guide?id=167`: the guide as last saved, for the editor to start from, with the version (`head`) its
 * saves go on top of. Any signed-in user. The published pages can be a minute or more behind this.
 */
export const Route = createFileRoute('/g/api/guide')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Never 404: CloudFront turns 404s into the guide home page.
        const editor = await requireEditor(request)
        if (editor instanceof Response) return editor
        const repo = await guideRepo()
        if (!repo) return json({ error: 'Saving is not set up here' }, 501)
        const id = new URL(request.url).searchParams.get('id') ?? ''
        if (!/^\d+$/.test(id)) return json({ error: 'No such guide' }, 400)
        try {
          const stored = await repo.read(id)
          return stored ? json({ head: stored.head, guide: stored.guide }) : json({ error: 'No such guide' }, 400)
        } catch (e) {
          console.error(e)
          return json({ error: 'Could not read the guide' }, 502)
        }
      },
    },
  },
})
