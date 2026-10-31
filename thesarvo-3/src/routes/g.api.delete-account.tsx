import { createFileRoute } from '@tanstack/react-router'
import { cognitoApi } from '#/auth/cognitoApi'
import { COGNITO } from '#/auth/config'
import { deleteAccount, poolIdOf } from '#/auth/deleteAccount'
import { requireEditor } from '#/auth/verifyToken'
import { bucketAvatars, removeAvatar } from '#/guide/avatars/upload'
import { imageBucket } from '#/guide/content/bucketImages'

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

/**
 * `POST /g/api/delete-account` (body `{ "confirm": "delete" }`): deletes the signed-in person's own sign-in and picture, for the apps'
 * "Delete my account". Forum posts and page edits stay under their name (privacy policy). 400 without the confirmation (never 404).
 */
export const Route = createFileRoute('/g/api/delete-account')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const editor = await requireEditor(request)
        if (editor instanceof Response) return editor
        const body = (await request.json().catch(() => null)) as { confirm?: unknown } | null
        if (body?.confirm !== 'delete') return json({ error: 'Send {"confirm":"delete"} to delete your account' }, 400)
        try {
          const b = imageBucket()
          if (b) await removeAvatar(bucketAvatars(b.bucket, b.creds), editor.sub).catch(() => undefined)
          await deleteAccount(cognitoApi(process.env.AWS_REGION ?? 'ap-southeast-2'), poolIdOf(COGNITO.issuer), editor.sub)
          return json({})
        } catch (e) {
          console.error(e)
          return json({ error: 'Could not delete your account. Please try again.' }, 502)
        }
      },
    },
  },
})
