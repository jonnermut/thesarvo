import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEscape, usePresence, useScrollLock } from '#/components/overlay'
import type { GuideNode } from '#/guide/model/types'
import { guideContents, matchesQuery } from './contents'
import type { ContentsEntry } from './contents'

const CLIMBS_KEY = 'thesarvo.contents.climbs'
/** Below the sticky header, with a little room: a block counts as current once its top passes this line. */
const SPY_LINE = 96

/** The anchor of the last entry whose block has scrolled past the top of the window. */
function useCurrentAnchor(anchors: string) {
  const [current, setCurrent] = useState<string>()
  useEffect(() => {
    const els = anchors
      .split(' ')
      .map((a) => document.getElementById(a)).filter((e): e is HTMLElement => !!e)
    let frame = 0
    const update = () => {
      frame = 0
      // Blocks are in document order, so a binary search finds the last one above the line.
      let lo = 0
      let hi = els.length - 1
      let found = -1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (els[mid].getBoundingClientRect().top < SPY_LINE) {
          found = mid
          lo = mid + 1
        } else hi = mid - 1
      }
      setCurrent(found >= 0 ? els[found].id : undefined)
    }
    const onScroll = () => {
      frame ||= requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [anchors])
  return current
}

function Row({ entry, current, onPick }: { entry: ContentsEntry; current: boolean; onPick?: () => void }) {
  return (
    <li>
      <a
        href={`#${entry.anchor}`}
        onClick={onPick}
        data-current={current || undefined}
        aria-current={current ? 'location' : undefined}
        className={`flex items-baseline gap-2 border-l-2 py-1 pr-2 text-[13px] leading-snug hover:text-link ${
          current ? 'border-amber text-link' : 'border-transparent'
        } ${entry.level ? 'pl-5' : 'pl-3'} ${entry.kind === 'climb' ? 'text-ink' : 'font-medium text-navy'}`}
      >
        {entry.kind === 'climb' && entry.number && <span className="w-5 shrink-0 text-right text-[11px] text-muted tabular-nums">{entry.number}</span>}
        <span className="min-w-0 flex-1">{entry.text}</span>
        {entry.kind === 'climb' && (
          <span className="shrink-0 text-[11px] text-muted tabular-nums">
            {entry.stars && <span className="text-amber-deep">{'★'.repeat(entry.stars.length)} </span>}
            {entry.grade}
          </span>
        )}
      </a>
    </li>
  )
}

/**
 * "On this page": the guide's headings (and optionally its climbs) as links, with the current
 * section marked as you scroll and a filter for finding a climb. A sticky column on wide
 * screens; a button and bottom sheet on smaller ones.
 */
export function GuideContents({ nodes }: { nodes: GuideNode[] }) {
  const entries = useMemo(() => guideContents(nodes), [nodes])
  const hasHeadings = entries.some((e) => e.kind === 'heading')
  const hasClimbs = entries.some((e) => e.kind === 'climb')
  const [showClimbs, setShowClimbs] = useState(false)
  const [query, setQuery] = useState('')
  const [sheet, setSheet] = useState(false)

  // Remembered after mount, so the built page and the first render agree.
  useEffect(() => {
    try {
      setShowClimbs(localStorage.getItem(CLIMBS_KEY) === '1')
    } catch {
      /* storage unavailable */
    }
  }, [])
  const toggleClimbs = (on: boolean) => {
    setShowClimbs(on)
    try {
      localStorage.setItem(CLIMBS_KEY, on ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  // Without headings the climbs are the contents. A filter always searches climbs.
  const withClimbs = showClimbs || !hasHeadings || !!query.trim()
  const shown = entries.filter((e) => (e.kind !== 'climb' || withClimbs) && (!query.trim() || matchesQuery(e, query)))
  const current = useCurrentAnchor(shown.map((e) => e.anchor).join(' '))

  const closeSheet = useCallback(() => setSheet(false), [])
  const sheetMounted = usePresence(sheet)
  useEscape(sheet, closeSheet)
  useScrollLock(sheet)

  if (entries.length < 3) return null

  const panel = (onPick?: () => void) => (
    <Panel
      shown={shown}
      current={current}
      query={query}
      setQuery={setQuery}
      climbsToggle={hasHeadings && hasClimbs ? { on: showClimbs, set: toggleClimbs } : undefined}
      onPick={onPick}
    />
  )

  return (
    <>
      <aside aria-label="On this page" className="no-print sticky top-20 hidden max-h-[calc(100dvh-6rem)] w-64 shrink-0 flex-col self-start xl:flex">
        {panel()}
      </aside>

      <div className="no-print xl:hidden">
        <button
          type="button"
          onClick={() => setSheet(true)}
          className="fixed right-4 bottom-4 z-20 flex items-center gap-2 rounded-full bg-forest px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-forest-soft"
        >
          <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden>
            <path d="M3 5h14v2H3zm0 4h10v2H3zm0 4h14v2H3z" />
          </svg>
          Contents
        </button>
        {sheetMounted && (
          <>
            <button
              type="button"
              aria-label="Close contents"
              className={`fixed inset-0 z-30 touch-none bg-black/40 transition-opacity duration-180 starting:opacity-0 ${sheet ? '' : 'pointer-events-none opacity-0'}`}
              onClick={closeSheet}
            />
            <div
              role="dialog"
              aria-label="On this page"
              className={`fixed inset-x-0 bottom-0 z-40 flex max-h-[75dvh] flex-col overscroll-contain rounded-t-2xl bg-white pt-2 shadow-2xl transition-[translate] duration-180 ease-out starting:translate-y-full ${sheet ? '' : 'translate-y-full'}`}
            >
              <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-black/15" aria-hidden />
              {panel(closeSheet)}
            </div>
          </>
        )}
      </div>
    </>
  )
}

function Panel({
  shown,
  current,
  query,
  setQuery,
  climbsToggle,
  onPick,
}: {
  shown: ContentsEntry[]
  current?: string
  query: string
  setQuery: (q: string) => void
  climbsToggle?: { on: boolean; set: (on: boolean) => void }
  onPick?: () => void
}) {
  const list = useRef<HTMLUListElement>(null)

  // Keep the current row in sight within the list, without moving the page.
  useEffect(() => {
    const box = list.current
    const row = box?.querySelector('[data-current]')
    if (!box || !row) return
    const r = row.getBoundingClientRect()
    const b = box.getBoundingClientRect()
    if (r.top < b.top || r.bottom > b.bottom) box.scrollTop += r.top - b.top - b.height / 3
  }, [current])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 px-3 pb-2">
        <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">On this page</h2>
        {climbsToggle && (
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" checked={climbsToggle.on} onChange={(e) => climbsToggle.set(e.target.checked)} />
            Climbs
          </label>
        )}
      </div>
      <div className="px-3 pb-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter: name, grade, **"
          aria-label="Filter this guide"
          className="w-full rounded-md border border-line bg-white px-2.5 py-1 text-[13px] placeholder:text-muted focus:border-link focus:outline-none"
        />
      </div>
      <ul ref={list} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3">
        {shown.map((e) => (
          <Row key={e.anchor} entry={e} current={e.anchor === current} onPick={onPick} />
        ))}
        {!shown.length && <li className="px-3 py-2 text-[13px] text-muted">Nothing matches</li>}
      </ul>
    </div>
  )
}
