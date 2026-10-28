import { createFileRoute } from '@tanstack/react-router'
import { requireEditor } from '#/auth/verifyToken'
import { BadPicture, bucketAvatars, removeAvatar, saveAvatar } from '#/guide/avatars/upload'
import { imageBucket } from '#/guide/content/bucketImages'

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

/**
 * Your own picture, for any signed-in user. `POST { image }` with a small `data:image/jpeg;base64,` URL (the browser crops and shrinks it to 128 px)
 * saves it as `avatars/<sub>.<hash>.jpg` and lists it in `avatars/uploaded.json`; `DELETE` takes it off the list. 400 for anything wrong (never 404).
 */
export const Route = createFileRoute('/g/api/avatar')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const editor = await requireEditor(request)
        if (editor instanceof Response) return editor
        const b = imageBucket()
        if (!b) return json({ error: 'Pictures cannot be saved here' }, 501)
        const body = (await request.json().catch(() => null)) as { image?: unknown } | null
        try {
          return json({ file: await saveAvatar(bucketAvatars(b.bucket, b.creds), editor.sub, body?.image) })
        } catch (e) {
          if (e instanceof BadPicture) return json({ error: e.message }, 400)
          console.error(e)
          return json({ error: 'Could not save your picture. Please try again.' }, 502)
        }
      },
      DELETE: async ({ request }) => {
        const editor = await requireEditor(request)
        if (editor instanceof Response) return editor
        const b = imageBucket()
        if (!b) return json({ error: 'Pictures cannot be saved here' }, 501)
        try {
          await removeAvatar(bucketAvatars(b.bucket, b.creds), editor.sub)
          return json({})
        } catch (e) {
          console.error(e)
          return json({ error: 'Could not remove your picture. Please try again.' }, 502)
        }
      },
    },
  },
})
