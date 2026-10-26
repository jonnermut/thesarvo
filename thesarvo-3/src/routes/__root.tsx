import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { AppShell } from '#/components/AppShell'
import appCss from '../styles.css?url'
import touchIcon from '#/brand/apple-touch-icon.png'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'thesarvo · Tasmanian climbing guides' },
      { name: 'theme-color', content: '#1b1464' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'apple-touch-icon', href: touchIcon },
    ],
  }),
  shellComponent: RootDocument,
  component: Layout,
})

function Layout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
