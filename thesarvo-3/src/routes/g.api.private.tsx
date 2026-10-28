import { createFileRoute } from '@tanstack/react-router'
import { requireEditor } from '#/auth/verifyToken'
import { getFullContent } from '#/guide/content'
import { pageAccess } from '#/auth/pageGuard'
import { loadPrivatePage, signedPhotos } from '#/guide/content/privatePage'
import { flatten } from '#/guide/content/paths'
import { guideRepo } from '#/guide/save/repo'

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

/**
 * `GET /g/api/private?id=167`: a private page (guide or body, history, signed photo links) for a signed-in user who may
 * read it (see src/guide/content/access.ts). 403 when they may not; 400 for a page that is public or missing.
 */
export const Route = createFileRoute('/g/api/private')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Never 404: CloudFront turns 404s into the guide home page.
        const editor = await requireEditor(request)
        if (editor instanceof Response) return editor
        const id = new URL(request.url).searchParams.get('id') ?? ''
        if (!/^\d+$/.test(id)) return json({ error: 'No such page' }, 400)
        const decision = await pageAccess(editor, id)
        if (decision === 'denied') return json({ error: 'You do not have access to this page' }, 403)
        if (decision === 'public') return json({ error: 'Not a private page' }, 400)
        try {
          const { all } = getFullContent()
          const node = flatten(await all.getIndex()).find((n) => n.id === id)
          if (!node) return json({ error: 'No such page' }, 400)
          return json(await loadPrivatePage(all, await guideRepo(), id, node.isGuide, signedPhotos))
        } catch (e) {
          console.error(e)
          return json({ error: 'Could not read the page' }, 502)
        }
      },
    },
  },
})
