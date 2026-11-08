import { createFileRoute } from '@tanstack/react-router'
import { activeNotices } from '#/forum/service'
import { forumStore } from '#/forum/store'

/**
 * `GET /g/api/forum-notices`: the forum posts an admin marked as notices (title and text, not the comments) that have not run out,
 * for the home page, for anyone. Not called by the home page, which reads the static `g-data/forum-notices.json`; kept for development and older apps.
 */
export const Route = createFileRoute('/g/api/forum-notices')({
  server: {
    handlers: {
      GET: async () => {
        const store = forumStore()
        const notices = store ? await activeNotices(store).catch(() => []) : []
        return Response.json(notices, { headers: { 'cache-control': 'public, max-age=60' } })
      },
    },
  },
})
