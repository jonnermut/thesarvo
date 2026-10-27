import { Link, useMatch, useMatches } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { signIn, useUser } from '#/auth/session'
import type { IndexNode } from '#/guide/content/types'
import { AccountMenu } from './AccountMenu'
import { animateLayout, useEscape, useScrollLock } from './overlay'
import { SearchBox } from './SearchBox'
import { SideNav } from './SideNav'

const STORAGE_KEY = 'thesarvo.sidebar'

function Logo() {
  return (
    <Link to="/g" className="flex items-center gap-2.5 text-white">
      <img src="/favicon.svg" alt="" className="size-8" />
      <span className="text-xl font-semibold tracking-tight">thesarvo</span>
      <span className="hidden text-sm text-white/70 sm:inline">Tasmanian climbing guides</span>
    </Link>
  )
}

/** "Edit this Guide" (or back to reading) for the guide on screen; nothing on other pages. */
function EditLink() {
  const match = useMatch({ from: '/g/$', shouldThrow: false })
  const user = useUser()
  if (!match?.loaderData?.guide) return null
  const editing = !!match.search.edit
  return (
    <Link
      to="/g/$"
      params={{ _splat: match.params._splat }}
      search={editing ? {} : { edit: true }}
      // Editing needs an account: sign in first, then land in the editor.
      onClick={(e) => {
        if (editing || user) return
        e.preventDefault()
        void signIn(`${location.pathname}?edit=true`)
      }}
      className="rounded-md border border-white/40 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10"
    >
      {editing ? (
        'View'
      ) : (
        <>
          Edit<span className="hidden sm:inline"> this Guide</span>
        </>
      )}
    </Link>
  )
}

/** Shared page frame: header, collapsible side navigation, footer. */
export function AppShell({ children }: { children: React.ReactNode }) {
  // Each page's loader brings a tree trimmed to its surroundings; the sidebar fills in the rest.
  const tree = useMatches({
    select: (matches) => matches.map((m) => m.loaderData as { tree?: IndexNode } | undefined).find((d) => d?.tree)?.tree,
  })
  // Desktop: sidebar is open unless collapsed (remembered). Mobile: a drawer, closed by default.
  const [collapsed, setCollapsed] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const closeDrawer = useCallback(() => setDrawer(false), [])

  // Editing wants the whole width: collapse while it lasts, then return to the remembered choice.
  const editing = !!useMatch({ from: '/g/$', shouldThrow: false })?.search.edit

  useEffect(() => {
    if (editing) {
      setCollapsed(true)
      return
    }
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === 'collapsed')
    } catch {
      /* storage unavailable: keep the default */
    }
  }, [editing])

  useScrollLock(drawer)
  useEscape(drawer, closeDrawer)

  const toggle = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      animateLayout()
      setCollapsed((c) => {
        try {
          localStorage.setItem(STORAGE_KEY, c ? 'open' : 'collapsed')
        } catch {
          /* ignore */
        }
        return !c
      })
    } else setDrawer((d) => !d)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 bg-brand px-4 shadow-md">
        <button
          type="button"
          onClick={toggle}
          aria-label="Toggle navigation"
          className="grid size-9 place-items-center rounded-md text-white hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <Logo />
        <div className="ml-auto flex items-center gap-2">
          <SearchBox />
          <EditLink />
          <AccountMenu />
        </div>
      </header>

      <div className="flex flex-1">
        <button
          type="button"
          aria-label="Close navigation"
          tabIndex={-1}
          className={`fixed inset-0 z-20 touch-none bg-black/40 transition-opacity duration-180 lg:hidden ${drawer ? '' : 'pointer-events-none opacity-0'}`}
          onClick={closeDrawer}
        />
        {/* Phones: a drawer that slides in. Desktop: a column that slides away (see animateLayout), hidden from tabbing when shut. */}
        <aside
          className={`side-nav no-print fixed inset-y-14 left-0 z-20 w-72 overscroll-contain border-r border-black/10 bg-paper max-lg:transition-[translate,visibility] max-lg:duration-180 max-lg:ease-out lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:shrink-0 lg:translate-x-0 ${
            drawer ? '' : '-translate-x-full invisible'
          } ${collapsed ? 'lg:invisible lg:-ml-72' : 'lg:visible'}`}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a')) setDrawer(false)
          }}
        >
          {tree && <SideNav local={tree} />}
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <footer className="no-print border-t border-black/10 bg-paper px-4 py-6 text-xs text-muted">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:justify-between">
          <p>© thesarvo.com · Climb safely. Guides are a starting point, not a guarantee.</p>
          <p>Tasmania, Australia</p>
        </div>
      </footer>
    </div>
  )
}
