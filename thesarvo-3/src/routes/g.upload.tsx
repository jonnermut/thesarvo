import { createFileRoute } from '@tanstack/react-router'
import { getContentSource } from '#/guide/content'
import { freeName, MAX_IMAGE_BYTES, uploadName } from '#/guide/content/paths'
import { mkdir, readdir, writeFile } from 'node:fs/promises'
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
        const forum = /^forum:([\w-]{1,40})$/.exec(guide)?.[1]
        if (forum) {
          // Development stand-in for the bucket's private/forum-images/.
          const name = uploadName(file.name)
          if (!name) return json({ error: 'Not a supported image (JPEG, PNG or GIF)' }, 400)
          const dir = `.saves/private/forum-images/${forum}`
          await mkdir(dir, { recursive: true })
          const stored = freeName(name, new Set((await readdir(dir)).map((n) => n.toLowerCase())))
          await writeFile(`${dir}/${stored}`, new Uint8Array(await file.arrayBuffer()))
          return json({ name: stored })
        }
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
