import { Link } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { signIn, signOut, useUser } from '#/auth/session'
import { useEscape } from './overlay'

/** "Sign in", or the signed-in user's initial opening a small menu. Decided after hydration, in the browser. */
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

  if (!user)
    return (
      <button type="button" onClick={() => void signIn()} className="rounded-md px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10">
        Sign in
      </button>
    )

  const label = user.name || user.email
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Account: ${label}`}
        aria-expanded={open}
        className="grid size-9 place-items-center rounded-full bg-white/15 text-sm font-semibold text-white uppercase hover:bg-white/25"
      >
        {label.charAt(0)}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border border-black/10 bg-paper p-1 text-sm shadow-lg">
          <div className="border-b border-black/10 px-3 py-2">
            <div className="truncate font-medium">{label}</div>
            {user.name && <div className="truncate text-muted">{user.email}</div>}
          </div>
          {user.hasPassword && (
            <Link to="/account/password" onClick={close} className="block w-full rounded-md px-3 py-2 text-left hover:bg-black/5">
              Change password
            </Link>
          )}
          <button type="button" onClick={signOut} className="w-full rounded-md px-3 py-2 text-left hover:bg-black/5">
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
