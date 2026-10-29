import { createFileRoute } from '@tanstack/react-router'
import { requireEditor } from '#/auth/verifyToken'
import { addComment, createThread, editPost, listThreads, readThread, Refused, removePost, setHidden, setNotice } from '#/forum/service'
import { withFileLinks } from '#/forum/files'
import { forumStore } from '#/forum/store'
import { viewerOf } from '#/forum/viewer'

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

/**
 * The forum, for signed-in users only. `GET /g/api/forum` lists the threads they may read; `?thread=<id>` gives one with its comments.
 * `POST` with `{ action: 'thread', title, text }`, `{ action: 'comment', thread, parent?, text }` or (admins) `{ action: 'hide', thread, comment?,
 * hidden }` or (the author) `{ action: 'edit', thread, comment?, title?, text }` or `{ action: 'remove', thread, comment? }` or (admins) `{ action: 'notice', thread, until }` (an ISO time, or null to end it) answers with the thread. 400 for anything wrong (never 404: CloudFront turns those into the home page).
 */
export const Route = createFileRoute('/g/api/forum')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const editor = await requireEditor(request)
        if (editor instanceof Response) return editor
        const store = forumStore()
        if (!store) return json({ error: 'The forum is not set up here' }, 501)
        const viewer = await viewerOf(editor)
        const id = new URL(request.url).searchParams.get('thread')
        if (id === null) return json(await listThreads(store, viewer))
        const thread = await readThread(store, viewer, id)
        return thread ? json(withFileLinks(thread)) : json({ error: 'No such post' }, 400)
      },
      POST: async ({ request }) => {
        const editor = await requireEditor(request)
        if (editor instanceof Response) return editor
        const store = forumStore()
        if (!store) return json({ error: 'The forum is not set up here' }, 501)
        const viewer = await viewerOf(editor)
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
        try {
          if (body?.action === 'thread') return json(await createThread(store, viewer, body))
          if (body?.action === 'comment') return json(await addComment(store, viewer, body))
          if (body?.action === 'edit') return json(await editPost(store, viewer, body))
          if (body?.action === 'remove') return json(await removePost(store, viewer, body))
          if (body?.action === 'hide') return json(await setHidden(store, viewer, body))
          if (body?.action === 'notice') return json(await setNotice(store, viewer, body))
          return json({ error: 'Unknown action' }, 400)
        } catch (e) {
          if (e instanceof Refused) return json({ error: e.message }, 400)
          console.error(e)
          return json({ error: 'Could not save. Please try again.' }, 502)
        }
      },
    },
  },
})
