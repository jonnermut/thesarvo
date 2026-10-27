import { Link } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { signIn, signOut, signUp, useUser } from '#/auth/session'
import { useEscape } from './overlay'

const ITEM = 'block w-full rounded-md px-3 py-2 text-left hover:bg-black/5'

/** One round button opening a small menu: the user's initial, or a person for a visitor, with sign in and create account. Decided after hydration, in the browser. */
export function AccountMenu() {
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

  const label = user ? user.name || user.email : ''
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={user ? `Account: ${label}` : 'Account'}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid size-9 place-items-center rounded-full bg-white/15 text-sm font-semibold text-white uppercase hover:bg-white/25"
      >
        {user ? (
          label.charAt(0)
        ) : (
          <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
            <circle cx="10" cy="7" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M3.75 17c.8-3.2 3.3-5 6.25-5s5.45 1.8 6.25 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-64 rounded-lg border border-black/10 bg-paper p-1 text-sm shadow-lg">
          {user ? (
            <>
              <div className="border-b border-black/10 px-3 py-2">
                <div className="truncate font-medium">{label}</div>
                {user.name && <div className="truncate text-muted">{user.email}</div>}
              </div>
              <Link to="/account/name" search={{}} role="menuitem" onClick={close} className={ITEM}>
                {user.name ? 'Change your name' : 'Add your name'}
              </Link>
              {user.hasPassword && (
                <Link to="/account/password" role="menuitem" onClick={close} className={ITEM}>
                  Change password
                </Link>
              )}
              <button type="button" role="menuitem" onClick={signOut} className={ITEM}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <button type="button" role="menuitem" onClick={() => void signIn()} className={ITEM}>
                <div className="font-medium">Sign in</div>
                <div className="text-xs text-muted">Old thesarvo accounts work here too</div>
              </button>
              <button type="button" role="menuitem" onClick={() => void signUp()} className={ITEM}>
                <div className="font-medium">Create account</div>
                <div className="text-xs text-muted">To edit the guides</div>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
