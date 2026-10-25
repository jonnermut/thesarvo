import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { guideUrl } from '#/guide/content/paths'
import { loadSearchIndex } from './load'
import { search } from './match'
import type { Group, Hit, SearchIndex } from './match'

/** A place a result opens. */
export type Target = { to: string; hash?: string }

/** Results in the order they are shown: each page, then what matched inside it. */
export const targets = (groups: Group[]): Target[] =>
  groups.flatMap((g) => [{ to: guideUrl(g.node) }, ...g.hits.map((h) => ({ to: guideUrl(h.node), hash: h.anchor }))])

/** Results for a query, loading the index the first time there is something to search for. */
export function useSearch(query: string, guideId?: string, limit?: number) {
  const [index, setIndex] = useState<SearchIndex>()
  const [failed, setFailed] = useState(false)
  const wanted = query.trim() !== ''
  useEffect(() => {
    if (!wanted || index) return
    let live = true
    loadSearchIndex()
      .then((i) => live && setIndex(i))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [wanted, index])
  const result = useMemo(() => (index && wanted ? search(index, query, guideId, limit) : undefined), [index, wanted, query, guideId, limit])
  return { result, loading: wanted && !index && !failed, failed }
}

/**
 * Arrow keys move through the results and Enter opens the highlighted one. Returns false from
 * `onKeyDown`'s Enter when nothing is highlighted, so the form submits as usual.
 */
export function useResultKeys(groups: Group[] | undefined, open: (target: Target) => void, list: () => HTMLElement | null) {
  const [active, setActive] = useState(-1)
  const all = useMemo(() => targets(groups ?? []), [groups])
  useEffect(() => setActive(-1), [groups])
  useEffect(() => {
    if (active >= 0) list()?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, list])
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (e.key === 'ArrowDown' ? Math.min(a + 1, all.length - 1) : Math.max(a - 1, -1)))
    } else if (e.key === 'Enter' && all[active]) {
      e.preventDefault()
      open(all[active])
    }
  }
  return { active, onKeyDown }
}

type Props = {
  groups: Group[]
  /** Index into `targets(groups)` of the highlighted result, or -1. */
  active: number
  onPick?: () => void
}

/** Results grouped by page, each page under the regions it is in. */
export function SearchResults({ groups, active, onPick }: Props) {
  let i = -1
  const row = (n: number) => `block px-3 ${n === active ? 'bg-paper' : 'hover:bg-paper'}`
  return (
    <ul className="divide-y divide-line/50">
      {groups.map((g) => (
        <li key={g.node.id} className="py-1.5">
          <Link to={guideUrl(g.node)} data-i={++i} onClick={onPick} className={`${row(i)} py-1`}>
            {g.trail.length > 0 && <span className="block truncate text-[11px] text-muted">{g.trail.map((t) => t.title).join(' › ')}</span>}
            <span className={g.page ? 'font-semibold text-navy' : 'text-[13px] font-medium text-muted'}>{g.node.title}</span>
          </Link>
          {g.hits.map((h) => (
            <Link key={h.anchor} to={guideUrl(h.node)} hash={h.anchor} data-i={++i} onClick={onPick} className={`${row(i)} py-1 text-sm`}>
              <HitRow hit={h} />
            </Link>
          ))}
        </li>
      ))}
    </ul>
  )
}

function HitRow({ hit }: { hit: Hit }) {
  if (hit.kind === 'h')
    return (
      <span className="flex gap-1.5">
        <span className="w-11 shrink-0 text-center text-muted" aria-hidden>
          §
        </span>
        <span className="min-w-0 truncate font-medium text-navy">{hit.text}</span>
      </span>
    )
  return (
    <span className="flex gap-1.5">
      <span className="w-11 shrink-0 text-amber-deep" aria-label={hit.stars ? `${hit.stars} stars` : undefined}>
        {'★'.repeat(hit.stars ?? 0)}
      </span>
      <span className="min-w-0 truncate">{hit.text}</span>
      <span className="shrink-0 text-muted">{hit.grade}</span>
      {hit.sport && <span className="shrink-0 text-[11px] leading-5 text-muted">sport</span>}
    </span>
  )
}
