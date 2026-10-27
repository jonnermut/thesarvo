import { createFileRoute } from '@tanstack/react-router'
import { requireEditor } from '#/auth/verifyToken'

/** `GET /g/api/admin`: a placeholder for admin-only endpoints; members of the Cognito group `admins` only. */
export const Route = createFileRoute('/g/api/admin')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const editor = await requireEditor(request, 'admins')
        return editor instanceof Response ? editor : Response.json({ ok: true, admin: editor.email })
      },
    },
  },
})
