import { Link, useRouterState } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { ancestorIds, flatten, guideUrl } from '#/guide/content/paths'
import type { IndexNode } from '#/guide/content/types'

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={`size-4 transition-transform ${open ? 'rotate-90' : ''}`} fill="currentColor" aria-hidden>
      <path d="M7 4l6 6-6 6V4z" />
    </svg>
  )
}

function NavItem({ node, currentPath, expanded, toggle, depth }: {
  node: IndexNode
  currentPath: string
  expanded: Set<string>
  toggle: (id: string) => void
  depth: number
}) {
  const isOpen = expanded.has(node.id)
  const active = node.path === currentPath
  return (
    <li>
      <div className="flex items-center rounded-md hover:bg-black/5" style={{ paddingLeft: depth * 12 }}>
        {node.children.length ? (
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
          className={`min-w-0 flex-1 truncate py-1.5 pr-2 text-sm ${active ? 'font-semibold text-link' : 'text-navy'}`}
          aria-current={active ? 'page' : undefined}
        >
          {node.title}
        </Link>
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

/** Expandable site tree with a title filter. Ancestors of the current page start open. */
export function SideNav({ root }: { root: IndexNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const currentPath = decodeURIComponent(pathname).replace(/^\/g\/?/, '')
  const [expanded, setExpanded] = useState(() => new Set(ancestorIds(root, currentPath)))
  const [query, setQuery] = useState('')

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? flatten(root).filter((n) => n.path && n.title.toLowerCase().includes(q)).slice(0, 40) : []
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
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {query ? (
          <ul>
            {matches.map((n) => (
              <li key={n.id}>
                <Link to={guideUrl(n)} className="block truncate rounded-md px-3 py-1.5 text-sm text-navy hover:bg-black/5">
                  {n.title}
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
