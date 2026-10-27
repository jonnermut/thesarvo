import { createFileRoute } from '@tanstack/react-router'
import { requireEditor } from '#/auth/verifyToken'

/** `GET /g/api/me`: who the bearer token belongs to, and their roles. Any signed-in user. */
export const Route = createFileRoute('/g/api/me')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const editor = await requireEditor(request)
        return editor instanceof Response ? editor : Response.json(editor)
      },
    },
  },
})
