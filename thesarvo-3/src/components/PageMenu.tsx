import { Link, useMatch } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { signIn, useUser } from '#/auth/session'
import type { PageMode } from '#/routes/g.$'
import { rememberPlace } from '#/guide/view/place'
import { useEscape } from './overlay'

/** One thing to do with the page on screen. Delete, add a child page and move will join History here. */
type Action = { label: string; hint: string; mode: PageMode }

/** What the page menu offers, given what the address shows now. */
export function pageActions(mode: PageMode): Action[] {
  return [
    ...(mode.edit || mode.history ? [{ label: 'View the page', hint: 'As readers see it', mode: {} }] : []),
    ...(mode.history ? [] : [{ label: 'History', hint: 'Who changed what, and when', mode: { history: true as const } }]),
  ]
}

const ITEM = 'block w-full rounded-md px-3 py-2 text-left hover:bg-black/5'

/**
 * The page's actions in the header: "Edit this Guide" (or "View" while editing) with a ▾ beside it opening the
 * rest. Pages that are not guides have only the menu, as "Page ▾".
 */
export function PageMenu() {
  const match = useMatch({ from: '/g/$', shouldThrow: false })
  const user = useUser()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useEscape(open, close)
  useEffect(() => {
    if (!open) return
    const outside = (e: PointerEvent) => box.current?.contains(e.target as Node) || setOpen(false)
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  if (!match?.loaderData) return null
  const splat = match.params._splat
  const mode = match.search
  const isGuide = !!match.loaderData.guide
  const editing = !!mode.edit
  const border = 'border border-white/40 text-sm font-medium text-white hover:bg-white/10'

  return (
    <div ref={box} className="relative flex">
      {isGuide && (
        <Link
          to="/g/$"
          params={{ _splat: splat }}
          search={editing ? {} : { edit: true }}
          rel="nofollow"
          // The editor opens where you were reading, and View goes back to where you were editing.
          resetScroll={false}
          // Editing needs an account: sign in first, then land in the editor.
          onClick={(e) => {
            if (editing || user) return rememberPlace()
            e.preventDefault()
            void signIn(`${location.pathname}?edit=true`)
          }}
          className={`${border} rounded-l-md px-3 py-1.5`}
        >
          {editing ? (
            'View'
          ) : (
            <>
              Edit<span className="hidden sm:inline"> this Guide</span>
            </>
          )}
        </Link>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Page menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${border} flex items-center gap-1 py-1.5 ${isGuide ? 'rounded-r-md border-l-0 px-2' : 'rounded-md px-3'}`}
      >
        {!isGuide && 'Page'}
        <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute top-full right-0 z-30 mt-2 w-60 rounded-lg border border-black/10 bg-paper p-1 text-sm shadow-lg">
          {pageActions(mode).map((a) => (
            <Link key={a.label} role="menuitem" to="/g/$" params={{ _splat: splat }} search={a.mode}
              rel="nofollow"
              resetScroll={!!a.mode.history}
              onClick={() => {
                rememberPlace()
                close()
              }}
              className={ITEM}
            >
              <div className="font-medium">{a.label}</div>
              <div className="text-xs text-muted">{a.hint}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
