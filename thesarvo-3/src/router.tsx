import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { installBridge } from './app/bridge'
import { STATIC_SITE } from './guide/content/paths'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  if (typeof window !== 'undefined') installBridge()
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // S3 serves pages as folders and redirects /g/search?q=x to /g/search/, dropping the query.
    trailingSlash: STATIC_SITE ? 'always' : 'never',
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
