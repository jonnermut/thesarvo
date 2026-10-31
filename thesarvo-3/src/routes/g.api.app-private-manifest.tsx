import { createFileRoute } from '@tanstack/react-router'
import { APP_LINK_SECONDS, buildPrivateManifest } from '#/app/privateManifest'
import { requireEditor } from '#/auth/verifyToken'
import { getFullContent } from '#/guide/content'
import { loadPrivatePage, signedPhotos } from '#/guide/content/privatePage'
import { guideRepo } from '#/guide/save/repo'

/**
 * `GET /g/api/app-private-manifest`: for the apps, everything private the signed-in person may read (pages, tree grafts) and signed,
 * expiring links for its photos (see src/app/privateManifest.ts). Empty for a person with no private pages. Never 404.
 */
export const Route = createFileRoute('/g/api/app-private-manifest')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const editor = await requireEditor(request)
        if (editor instanceof Response) return editor
        try {
          const { all, access } = getFullContent()
          const repo = await guideRepo()
          const manifest = await buildPrivateManifest({
            index: await all.getIndex(),
            access: await access(),
            groups: editor.groups,
            now: new Date(),
            loadPage: (id, isGuide) => loadPrivatePage(all, repo, id, isGuide, (g) => signedPhotos(g, process.env, APP_LINK_SECONDS)),
          })
          return Response.json(manifest, { headers: { 'cache-control': 'no-store' } })
        } catch (e) {
          console.error(e)
          return Response.json({ error: 'Could not read the private pages' }, { status: 502, headers: { 'cache-control': 'no-store' } })
        }
      },
    },
  },
})
