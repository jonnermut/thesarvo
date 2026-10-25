import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { IndexNode } from '#/guide/content/types'
import { SideNav } from './SideNav'

const STORAGE_KEY = 'thesarvo.sidebar'

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 text-white">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <path d="M2 27 12 8l6 10 3-5 9 14z" fill="#f7941e" />
        <path d="M12 8l-3 6 3-1 2 3z" fill="#fff" opacity=".85" />
      </svg>
      <span className="text-xl font-semibold tracking-tight">thesarvo</span>
      <span className="hidden text-sm text-white/70 sm:inline">Tasmanian climbing guides</span>
    </Link>
  )
}

/** Shared page frame: header, collapsible side navigation, footer. */
export function AppShell({ index, children }: { index: IndexNode; children: React.ReactNode }) {
  // Desktop: sidebar is open unless collapsed (remembered). Mobile: a drawer, closed by default.
  const [collapsed, setCollapsed] = useState(false)
  const [drawer, setDrawer] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === 'collapsed')
    } catch {
      /* storage unavailable: keep the default */
    }
  }, [])

  const toggle = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
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
      <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 bg-forest px-4 shadow-md">
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
      </header>

      <div className="flex flex-1">
        {drawer && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setDrawer(false)} />}
        <aside
          className={`no-print fixed inset-y-14 left-0 z-20 w-72 bg-paper transition-transform lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] border-r border-black/10 lg:shrink-0 ${
            drawer ? 'translate-x-0' : '-translate-x-full'
          } ${collapsed ? 'lg:hidden' : 'lg:translate-x-0'}`}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a')) setDrawer(false)
          }}
        >
          <SideNav root={index} />
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
