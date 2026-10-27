import { createFileRoute } from '@tanstack/react-router'
import { getContentSource } from '#/guide/content'
import { MAX_IMAGE_BYTES } from '#/guide/content/paths'
import { requireEditor } from '#/auth/verifyToken'

const json = (body: unknown, status = 200) => Response.json(body, { status })

/**
 * Accepts one image per request: `POST /g/upload?guide=<id>` with a multipart `file`.
 * Only for a signed-in editor: the browser sends its Cognito ID token as a bearer token.
 */
export const Route = createFileRoute('/g/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const editor = await requireEditor(request)
        if (editor instanceof Response) return editor
        const guide = new URL(request.url).searchParams.get('guide') ?? ''
        const file = (await request.formData()).get('file')
        if (!(file instanceof File)) return json({ error: 'No file' }, 400)
        if (file.size > MAX_IMAGE_BYTES) return json({ error: 'Image is over 25 MB' }, 413)
        try {
          const name = await getContentSource().saveImage(guide, file.name, new Uint8Array(await file.arrayBuffer()))
          return json({ name })
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : 'Upload failed' }, 400)
        }
      },
    },
  },
})
