import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { NothingFound, SearchResults, useResultKeys, useSearch } from '#/guide/search/SearchResults'
import type { Target } from '#/guide/search/SearchResults'
import { fetchPage } from '#/guide/server'

const LIMIT = 300

export const Route = createFileRoute('/g/search')({
  validateSearch: (search: Record<string, unknown>): { q?: string } => (typeof search.q === 'string' && search.q ? { q: search.q } : {}),
  // The sidebar's tree.
  loader: async () => (await fetchPage(''))!,
  head: () => ({ meta: [{ title: 'Search · thesarvo' }] }),
  component: SearchPage,
})

/**
 * Full results, with an address that can be shared. The static site builds this page once, without
 * a query, so the query is read from the address after loading.
 */
function SearchPage() {
  const { q } = Route.useSearch()
  const navigate = useNavigate()
  const [query, setQuery] = useState<string>()
  useEffect(() => setQuery((current) => current ?? q ?? ''), [q])
  const { result, loading, failed } = useSearch(query ?? '', undefined, LIMIT)
  const list = useRef<HTMLDivElement>(null)
  const go = (target: Target) => void navigate({ to: target.to, hash: target.hash })
  const { active, onKeyDown } = useResultKeys(result?.groups, go, useCallback(() => list.current, []))
  const update = (value: string) => {
    setQuery(value)
    void navigate({ to: '/g/search', search: value.trim() ? { q: value } : {}, replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <h1 className="border-b border-line text-[28px] font-bold text-navy">Search</h1>
      <form role="search" className="mt-4" onSubmit={(e) => e.preventDefault()}>
        <input
          name="q"
          type="search"
          autoComplete="off"
          autoFocus
          aria-label="Search climbs and crags"
          placeholder="A climb, crag or heading; ** for stars, 20-23 for grades, sport, trad, boulder"
          value={query ?? ''}
          onChange={(e) => update(e.target.value)}
          onKeyDown={onKeyDown}
          className="w-full rounded-md border border-line px-3 py-2 text-base outline-none focus:border-link"
        />
      </form>
      <div ref={list} className="mt-4">
        {loading && <p className="text-sm text-muted">Loading…</p>}
        {failed && <p className="text-sm text-muted">Search is not available right now.</p>}
        {result?.total === 0 && <NothingFound suggestion={result.suggestion} onTry={update} />}
        {!!result?.total && (
          <p className="mb-2 text-sm text-muted">
            {result.total > LIMIT ? `The best ${LIMIT} of ${result.total.toLocaleString()} results` : result.total === 1 ? '1 result' : `${result.total.toLocaleString()} results`}
          </p>
        )}
        {result && <SearchResults groups={result.groups} active={active} />}
      </div>
    </div>
  )
}
