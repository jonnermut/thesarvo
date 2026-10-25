import { createReadStream, existsSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { DEFAULT_CONTENT_DIR } from './src/guide/content/defaultDir'

/**
 * Dev only: serve `/content?f=<file>` straight from the content folder.
 * The dev server answers image requests (Sec-Fetch-Dest: image) before our route sees them.
 */
function devContentFiles(): Plugin {
  const dir = process.env.CONTENT_DIR ?? DEFAULT_CONTENT_DIR
  return {
    name: 'dev-content-files',
    configureServer(server) {
      server.middlewares.use('/content', (req, res, next) => {
        const name = new URL(req.url ?? '', 'http://x').searchParams.get('f') ?? ''
        const file = path.join(dir, path.basename(name))
        if (!name || !existsSync(file)) return next()
        res.setHeader('content-type', file.endsWith('.png') ? 'image/png' : 'image/jpeg')
        res.setHeader('cache-control', 'public, max-age=3600')
        createReadStream(file).pipe(res)
      })
    },
  }
}

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devContentFiles(), nitro(), tanstackStart(), viteReact(), tailwindcss()],
})
