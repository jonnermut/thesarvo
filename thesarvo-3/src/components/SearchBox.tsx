import { useMatch, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { GUIDE_PREFIX } from '#/guide/content/paths'
import { loadSearchIndex } from '#/guide/search/load'
import { SearchResults, useResultKeys, useSearch } from '#/guide/search/SearchResults'
import type { Target } from '#/guide/search/SearchResults'

const SEARCH_URL = `${GUIDE_PREFIX}/search`

const isEditable = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

const wide = () => window.matchMedia('(min-width: 640px)').matches

/**
 * The search box in the top bar; on phones an icon that opens it full screen. Before the page is
 * interactive it is a plain form (or link) to the search page. `/` or Cmd-K focuses it.
 */
export function SearchBox() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [scope, setScope] = useState<'all' | 'guide'>('all')
  const form = useRef<HTMLFormElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  const match = useMatch({ from: '/g/$', shouldThrow: false })
  const guide = match?.loaderData?.guide ? match.loaderData.node : undefined
  const { result, loading, failed } = useSearch(query, scope === 'guide' ? guide?.id : undefined)
  // "This guide" means the one on screen; another guide starts from everywhere again.
  useEffect(() => setScope('all'), [guide?.id])

  const close = useCallback(() => {
    setOpen(false)
    setSheet(false)
    input.current?.blur()
  }, [])
  const go = (target: Target) => {
    close()
    void navigate({ to: target.to, hash: target.hash })
  }
  const { active, onKeyDown } = useResultKeys(result?.groups, go, useCallback(() => panel.current, []))

  // `/` or Cmd-K from anywhere that is not a text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!((e.key === '/' && !isEditable(e.target)) || (e.key === 'k' && (e.metaKey || e.ctrlKey)))) return
      e.preventDefault()
      if (wide()) input.current?.focus()
      else setSheet(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // A click outside closes the results.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => form.current?.contains(e.target as Node) || setOpen(false)
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  useEffect(() => {
    if (sheet) input.current?.focus()
  }, [sheet])

  const showing = (open || sheet) && query.trim() !== ''
  return (
    <>
      <a
        href={SEARCH_URL}
        aria-label="Search"
        className="grid size-9 place-items-center rounded-md text-white hover:bg-white/10 sm:hidden"
        onClick={(e) => {
          e.preventDefault()
          setSheet(true)
        }}
      >
        <SearchIcon className="size-5" />
      </a>
      <form
        ref={form}
        role="search"
        action={SEARCH_URL}
        method="get"
        className={sheet ? 'fixed inset-0 z-40 flex flex-col bg-card' : 'relative hidden sm:block'}
        onSubmit={(e) => {
          e.preventDefault()
          close()
          void navigate({ to: SEARCH_URL, search: { q: query.trim() } })
        }}
      >
        <div className={sheet ? 'flex items-center gap-2 border-b border-line p-3' : ''}>
          <label className="relative block flex-1">
            <span className="sr-only">Search climbs and crags</span>
            <SearchIcon className={`pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 ${sheet ? 'text-muted' : 'text-white/70'}`} />
            <input
              ref={input}
              name="q"
              type="search"
              autoComplete="off"
              placeholder="Search climbs, crags…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              onFocus={() => {
                setOpen(true)
                loadSearchIndex().catch(() => {})
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') close()
                else onKeyDown(e)
              }}
              className={
                sheet
                  ? 'w-full rounded-md border border-line py-2 pr-2 pl-8 text-base outline-none focus:border-link'
                  : 'w-52 rounded-md bg-white/15 py-1.5 pr-2 pl-8 text-sm text-white placeholder:text-white/60 outline-none focus:bg-white focus:text-ink focus:placeholder:text-muted md:w-72'
              }
            />
          </label>
          {sheet && (
            <button type="button" onClick={close} className="px-2 py-1 text-sm font-medium text-link">
              Close
            </button>
          )}
        </div>
        {showing && (
          <div
            ref={panel}
            className={
              sheet
                ? 'min-h-0 flex-1 overflow-y-auto'
                : 'absolute top-full right-0 mt-2 max-h-[70vh] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-md border border-line bg-card text-ink shadow-lg'
            }
          >
            {guide && (
              <div className="flex gap-1 border-b border-line px-3 py-2 text-[13px]">
                {(['all', 'guide'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setScope(s)
                      input.current?.focus()
                    }}
                    className={`rounded-full px-2.5 py-0.5 ${scope === s ? 'bg-navy text-white' : 'text-link hover:bg-paper'}`}
                  >
                    {s === 'all' ? 'Everywhere' : guide.title}
                  </button>
                ))}
              </div>
            )}
            {loading && <p className="px-3 py-3 text-sm text-muted">Loading…</p>}
            {failed && <p className="px-3 py-3 text-sm text-muted">Search is not available right now.</p>}
            {result && result.groups.length === 0 && <p className="px-3 py-3 text-sm text-muted">Nothing found.</p>}
            {result && result.groups.length > 0 && (
              <>
                <SearchResults groups={result.groups} active={active} onPick={close} />
                {result.total > result.groups.reduce((n, g) => n + g.hits.length + (g.page ? 1 : 0), 0) && (
                  <button type="submit" className="block w-full border-t border-line px-3 py-2 text-left text-sm font-medium text-link hover:bg-paper">
                    All {result.total.toLocaleString()} results
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </form>
    </>
  )
}

function SearchIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}
