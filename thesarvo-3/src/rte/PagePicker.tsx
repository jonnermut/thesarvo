import { useEffect, useMemo, useState } from 'react'
import { fetchGuide, fetchTree } from '#/guide/server'
import { guideUrl } from '#/guide/content/paths'
import type { IndexNode } from '#/guide/content/types'
import type { Guide } from '#/guide/model/types'
import { findPages, guidePlaces } from './linkTargets'

const row = 'block w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-link'

/** Find a guide or page by title, then optionally one of its climbs or topos; hands back the address and a title to use as the link text. */
export function PagePicker({ onPick }: { onPick: (href: string, text: string) => void }) {
  const [tree, setTree] = useState<IndexNode | null>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState<IndexNode | null>(null)
  const [guide, setGuide] = useState<Guide | null>(null)
  useEffect(() => {
    let live = true
    void fetchTree().then((t) => live && setTree(t), () => {})
    return () => {
      live = false
    }
  }, [])
  useEffect(() => {
    setGuide(null)
    if (!page?.isGuide) return
    let live = true
    void fetchGuide({ data: page.id }).then((g) => live && setGuide(g), () => {})
    return () => {
      live = false
    }
  }, [page])
  const hits = useMemo(() => (tree && !page ? findPages(tree, query) : []), [tree, query, page])
  const places = useMemo(() => (page && guide ? guidePlaces(page, guide) : []), [page, guide])

  return (
    <div className="border-t border-line px-2 py-1.5 text-sm">
      {page ? (
        <div>
          <div className="flex items-center gap-2 px-2 pb-1">
            <span className="min-w-0 flex-1 truncate font-medium">{page.title}</span>
            <button type="button" onClick={() => setPage(null)} className="text-muted hover:underline">
              Change
            </button>
          </div>
          {page.isGuide && !guide && <p className="px-2 py-1 text-muted">Loading climbs…</p>}
          {places.length > 0 && (
            <ul className="max-h-48 overflow-y-auto" aria-label={`Places in ${page.title}`}>
              {places.map((p) => (
                <li key={p.href}>
                  <button type="button" className={row} onClick={() => onPick(p.href, p.label)}>
                    {p.label}
                    <span className="ml-2 text-xs text-muted">{p.kind}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Or find a guide, page, climb or topo by page title" aria-label="Find a page" className="w-full rounded-md border border-line bg-card px-2 py-1 focus:border-link focus:outline-none" />
          {hits.length > 0 && (
            <ul className="mt-1" aria-label="Pages">
              {hits.map(({ node, where }) => (
                <li key={node.id} className="flex items-center gap-1">
                  <button type="button" className={`${row} flex-1`} onClick={() => onPick(guideUrl(node), node.title)}>
                    {node.title}
                    {where && <span className="ml-2 text-xs text-muted">{where}</span>}
                  </button>
                  {node.isGuide && (
                    <button type="button" className="shrink-0 rounded px-2 py-1 text-xs text-link hover:bg-paper" onClick={() => setPage(node)} aria-label={`A climb or topo in ${node.title}`}>
                      Climbs ›
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
