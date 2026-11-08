import { createFileRoute } from '@tanstack/react-router'
import { recentThreads } from '#/forum/service'
import { forumStore } from '#/forum/store'

/**
 * `GET /g/api/forum-recent`: the newest few threads (title, author, time, comment count; none of the text) for the home page,
 * for anyone. Not called by the home page, which reads the static `g-data/forum-recent.json` (a public page never runs the Lambda); kept for development and older apps.
 */
export const Route = createFileRoute('/g/api/forum-recent')({
  server: {
    handlers: {
      GET: async () => {
        const store = forumStore()
        const threads = store ? await recentThreads(store).catch(() => []) : []
        return Response.json(threads, { headers: { 'cache-control': 'public, max-age=60' } })
      },
    },
  },
})
