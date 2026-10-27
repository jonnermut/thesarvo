import { createReadStream, existsSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { DEFAULT_CONTENT_DIR } from './src/guide/content/defaultDir'
import { staticSource } from './src/guide/content/staticSource'
import { flatten, guideUrl, GUIDE_PREFIX } from './src/guide/content/paths'
import { CALLBACK_PATH, NAME_PATH, PASSWORD_PATH } from './src/auth/paths'

/**
 * Dev only: serve `/g/content?f=<file>` straight from the content folder.
 * The dev server answers image requests (Sec-Fetch-Dest: image) before our route sees them.
 */
function devContentFiles(): Plugin {
  const dir = process.env.CONTENT_DIR ?? DEFAULT_CONTENT_DIR
  const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? 'uploads')
  return {
    name: 'dev-content-files',
    configureServer(server) {
      server.middlewares.use('/g/content', (req, res, next) => {
        const name =
          new URL(req.url ?? '', 'http://x').searchParams.get('f') ?? ''
        const file = [dir, uploadDir]
          .map((d) => path.join(d, path.basename(name)))
          .find((f) => name && existsSync(f))
        if (!file) return next()
        res.setHeader(
          'content-type',
          file.endsWith('.png') ? 'image/png' : 'image/jpeg',
        )
        res.setHeader('cache-control', 'public, max-age=3600')
        createReadStream(file).pipe(res)
      })
    },
  }
}

// Guides are rendered on demand; only the paths listed here become static HTML at build time.
// e.g. PRERENDER_PATHS="/g,/g/tasmania" npm run build
// For the static site (`npm run build-site`) every page of the content repo is rendered, unless an
// incremental build lists the changed ones.
const staticSite = process.env.VITE_STATIC_SITE === '1'
const prerenderPaths =
  staticSite && process.env.PRERENDER_PATHS === undefined
    ? [GUIDE_PREFIX, `${GUIDE_PREFIX}/search`, CALLBACK_PATH, PASSWORD_PATH, NAME_PATH, ...flatten(await staticSource().getIndex()).filter((n) => n.path).map(guideUrl)]
    : (process.env.PRERENDER_PATHS ?? '').split(',').filter(Boolean)

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devContentFiles(),
    // The Lambda build (NITRO_PRESET=aws-lambda) carries the JS and CSS inside the function; behind CloudFront they would come from S3.
    ...(staticSite ? [] : [nitro(process.env.NITRO_PRESET === 'aws-lambda' ? { serveStatic: 'inline' } : undefined)]),
    tanstackStart(
      prerenderPaths.length
        ? {
            prerender: { enabled: true, crawlLinks: false, autoSubfolderIndex: true },
            pages: prerenderPaths.map((page) => ({ path: page })),
          }
        : {},
    ),
    viteReact(),
    tailwindcss(),
  ],
})
