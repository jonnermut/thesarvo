import { Link, useRouterState } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ancestorIds, findByPath, guideUrl } from '#/guide/content/paths'
import { fetchTree } from '#/guide/server'
import type { IndexNode } from '#/guide/content/types'
import { RecentGuides } from './RecentGuides'

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={`size-4 transition-transform ${open ? 'rotate-90' : ''}`} fill="currentColor" aria-hidden>
      <path d="M7 4l6 6-6 6V4z" />
    </svg>
  )
}

function NavItem({
  node,
  currentPath,
  expanded,
  toggle,
  depth,
}: {
  node: IndexNode
  currentPath: string
  expanded: Set<string>
  toggle: (id: string) => void
  depth: number
}) {
  const isOpen = expanded.has(node.id)
  const active = node.path === currentPath
  const onTrail = !active && (node.path === '' || currentPath.startsWith(`${node.path}/`))
  return (
    <li>
      <div
        data-active={active || undefined}
        className={`flex items-center rounded-md hover:bg-black/5 ${active ? 'bg-amber/15' : ''}`}
        style={{ paddingLeft: depth * 12 }}
      >
        {node.children.length || node.more ? (
          <button
            type="button"
            onClick={() => toggle(node.id)}
            aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${node.title}`}
            aria-expanded={isOpen}
            className="grid size-7 shrink-0 place-items-center text-muted hover:text-navy"
          >
            <Chevron open={isOpen} />
          </button>
        ) : (
          <span className="size-7 shrink-0" />
        )}
        <Link
          to={guideUrl(node)}
          // Going to a page opens it (see SideNav); clicking the page you are on toggles it.
          onClick={() => active && node.children.length && toggle(node.id)}
          className={`min-w-0 flex-1 truncate py-1.5 pr-2 text-sm ${active ? 'font-semibold text-link' : onTrail ? 'font-medium text-navy' : 'text-navy'}`}
          aria-current={active ? 'page' : undefined}
        >
          {node.title}
        </Link>
        {!!node.count && (
          <span className="shrink-0 pr-2 text-xs text-muted tabular-nums" title={`${node.count} climbs and problems`}>
            {node.count}
          </span>
        )}
      </div>
      {isOpen && node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <NavItem key={child.id} node={child} currentPath={currentPath} expanded={expanded} toggle={toggle} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

/** The current page's ancestors and the page itself: what must be open to show where you are. */
function trailIds(root: IndexNode, path: string) {
  const node = findByPath(root, path)
  return node ? [...ancestorIds(root, path), node.id] : []
}

/**
 * Expandable site tree with a title filter. Every navigation opens the tree down to the
 * new page (and the page itself) and scrolls it into view; branches opened by hand stay open.
 */
export function SideNav({ local }: { local: IndexNode }) {
  // Rendered from the page's own trimmed tree, then the full current tree once the page is live.
  const [full, setFull] = useState<IndexNode>()
  useEffect(() => {
    fetchTree().then(setFull, () => {
      /* keep the trimmed tree */
    })
  }, [])
  const root = full ?? local
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const currentPath = decodeURIComponent(pathname)
    .replace(/^\/g\/?/, '')
    .replace(/\/$/, '')
  const [expanded, setExpanded] = useState(() => new Set(trailIds(root, currentPath)))
  const [query, setQuery] = useState('')
  const [shownPath, setShownPath] = useState(currentPath)
  const scroller = useRef<HTMLDivElement>(null)

  // Adjusting state during render (not in an effect) opens the new trail in the same paint.
  if (shownPath !== currentPath) {
    setShownPath(currentPath)
    setQuery('')
    setExpanded((prev) => new Set([...prev, ...trailIds(root, currentPath)]))
  }

  // Scroll only the tree (scrollIntoView would also move the page), centring the row if it is out of sight.
  useEffect(() => {
    const box = scroller.current
    const row = box?.querySelector('[data-active]')
    if (!box || !row) return
    const r = row.getBoundingClientRect()
    const b = box.getBoundingClientRect()
    if (r.top < b.top || r.bottom > b.bottom) box.scrollTop += r.top - b.top - b.height / 2
  }, [currentPath, query])

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    // Each match with its parent's title, since tidied titles repeat (two "Hillwood"s).
    const withParent = (n: IndexNode): { node: IndexNode; parent: string }[] =>
      n.children.flatMap((c) => [{ node: c, parent: n.path ? n.title : '' }, ...withParent(c)])
    return withParent(root)
      .filter(({ node }) => node.title.toLowerCase().includes(q))
      .slice(0, 40)
  }, [root, query])

  return (
    <nav aria-label="Guides" className="flex h-full flex-col">
      <div className="p-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a crag…"
          className="w-full rounded-md border border-line bg-white px-3 py-1.5 text-sm placeholder:text-muted focus:border-link focus:outline-none"
        />
        {!query && <RecentGuides current={currentPath} className="mt-3" />}
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {query ? (
          <ul>
            {matches.map(({ node, parent }) => (
              <li key={node.id}>
                <Link to={guideUrl(node)} className="block truncate rounded-md px-3 py-1.5 text-sm text-navy hover:bg-black/5">
                  {node.title}
                  {parent && <span className="ml-1.5 text-xs text-muted">{parent}</span>}
                </Link>
              </li>
            ))}
            {!matches.length && <li className="px-3 py-2 text-sm text-muted">No matches</li>}
          </ul>
        ) : (
          <ul>
            {root.children.map((node) => (
              <NavItem key={node.id} node={node} currentPath={currentPath} expanded={expanded} toggle={toggle} depth={0} />
            ))}
          </ul>
        )}
      </div>
    </nav>
  )
}
