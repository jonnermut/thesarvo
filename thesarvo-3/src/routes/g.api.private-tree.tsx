import { createFileRoute } from '@tanstack/react-router'
import { requireEditor } from '#/auth/verifyToken'
import { getFullContent } from '#/guide/content'
import { readableGrafts } from '#/guide/content/privateSite'

/**
 * `GET /g/api/private-tree`: the private pages the signed-in user may read, as subtrees to graft onto the public tree
 * (`Graft[]`, see src/guide/content/privateSite.ts). Empty for a user with no access to any.
 */
export const Route = createFileRoute('/g/api/private-tree')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const editor = await requireEditor(request)
        if (editor instanceof Response) return editor
        const { all, access } = getFullContent()
        return Response.json(readableGrafts(await all.getIndex(), await access(), editor.groups), { headers: { 'cache-control': 'no-store' } })
      },
    },
  },
})
