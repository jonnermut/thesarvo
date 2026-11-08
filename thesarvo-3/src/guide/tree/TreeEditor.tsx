import { Link } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { movePage, readTree, renamePage, restoreTree, sortPages } from './api'
import type { StoredIndexNode } from '#/guide/content/syncFeed'
import { flat, isSorted, pathsOf, withMovedPage, withSortedChildren, withTitle } from '#/guide/save/treeOps'
import { refreshManifest } from '#/guide/server'
import { dropPlace, stepPlace, zoneAt } from './drop'
import type { Zone } from './drop'

type Place = { parent: string; position: number }

/** Ids from the top down to (not including) `id`. */
function ancestorsOf(n: StoredIndexNode, id: string, trail: string[] = []): string[] | null {
  if (n.id === id) return trail
  for (const c of n.children) {
    const hit = ancestorsOf(c, id, [...trail, n.id])
    if (hit) return hit
  }
  return null
}

const BUTTON = 'grid size-7 place-items-center rounded text-muted hover:bg-wash/10 hover:text-navy disabled:opacity-30 disabled:hover:bg-transparent'

/**
 * The page tree, to arrange: drag a page above, below or onto another (it becomes that page's last child), rename it, undo.
 * Each change is one commit and takes about 20 seconds to reach the site; the page's old address keeps leading to it.
 */
export default function TreeEditor({ selected }: { selected?: string }) {
  const [index, setIndex] = useState<StoredIndexNode>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [current, setCurrent] = useState(selected)
  const [undo, setUndo] = useState<StoredIndexNode[]>([])
  const [drag, setDrag] = useState<string>()
  const [over, setOver] = useState<{ id: string; zone: Zone }>()
  const [renaming, setRenaming] = useState<string>()
  const row = useRef<HTMLLIElement>(null)

  useEffect(() => {
    void readTree().then((r) => {
      if (!r.ok) return setError(r.message)
      setIndex(r.value.index)
      // The page you came from is open and highlighted; the top level is open too.
      setOpen(new Set([r.value.index.id, ...(selected ? (ancestorsOf(r.value.index, selected) ?? []) : [])]))
    })
  }, [selected])
  useEffect(() => {
    row.current?.scrollIntoView({ block: 'center' })
  }, [index === undefined, current])

  const paths = useMemo(() => (index ? pathsOf(index) : new Map<string, string>()), [index])

  const run = useCallback(async (next: StoredIndexNode, request: Promise<Awaited<ReturnType<typeof movePage>>>, onDone?: (before: StoredIndexNode) => void) => {
    setBusy(true)
    setError(undefined)
    const r = await request
    setBusy(false)
    if (!r.ok) return setError(r.message)
    setIndex(next)
    onDone?.(r.value.before)
    // The site's own tree follows once the publish is done; whoever shows it asks again.
    refreshManifest()
  }, [])

  const move = (id: string, place: Place | null) => {
    if (!index || !place || busy) return
    const next = withMovedPage(index, id, place.parent, place.position)
    if (!next) return setError('Cannot move a page into itself')
    setOpen((o) => new Set(o).add(place.parent))
    void run(next, movePage(id, place.parent, place.position), (before) => setUndo((u) => [...u, before]))
  }

  const rename = (id: string, title: string) => {
    setRenaming(undefined)
    const clean = title.replace(/\s+/g, ' ').trim()
    const next = index && clean && withTitle(index, id, clean)
    if (!next || !index || flat(index).find((n) => n.id === id)?.title === clean) return
    void run(next, renamePage(id, clean), (before) => setUndo((u) => [...u, before]))
  }

  const sort = (parent: string) => {
    const next = index && !busy && withSortedChildren(index, parent)
    if (next) void run(next, sortPages(parent), (before) => setUndo((u) => [...u, before]))
  }

  const undoLast = () => {
    const before = undo.at(-1)
    if (!before) return
    void run(before, restoreTree(before), () => setUndo((u) => u.slice(0, -1)))
  }

  const toggle = (id: string) => setOpen((o) => (o.has(id) ? new Set([...o].filter((x) => x !== id)) : new Set(o).add(id)))

  // A function, not a component: rows must not remount (and lose the rename box's focus) on every change.
  const renderRow = (node: StoredIndexNode, depth: number): React.ReactNode => {
    const isOpen = open.has(node.id)
    const top = node.id === index?.id
    const here = node.id === current
    const zone = over?.id === node.id && drag ? over.zone : undefined
    const place = (step: Parameters<typeof stepPlace>[2]) => (index ? stepPlace(index, node.id, step) : null)
    return (
      <li key={node.id} ref={here ? row : undefined}>
        <div
          draggable={!top && !busy && renaming !== node.id}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', node.id)
            setDrag(node.id)
          }}
          onDragEnd={() => (setDrag(undefined), setOver(undefined))}
          onDragOver={(e) => {
            if (!drag || !index) return
            const box = e.currentTarget.getBoundingClientRect()
            const z = zoneAt(e.clientY - box.top, box.height)
            // A drop that is not allowed shows no marker and no "move" cursor.
            if (!dropPlace(index, drag, node.id, z)) return setOver(undefined)
            e.preventDefault()
            setOver({ id: node.id, zone: z })
          }}
          onDrop={(e) => {
            e.preventDefault()
            if (drag && over) move(drag, dropPlace(index!, drag, over.id, over.zone))
            setDrag(undefined)
            setOver(undefined)
          }}
          onClick={() => setCurrent(node.id)}
          aria-current={here || undefined}
          style={{ paddingLeft: depth * 20 }}
          className={`relative flex items-center rounded-md hover:bg-wash/5 ${here ? 'bg-amber/15' : ''} ${zone === 'into' ? 'ring-2 ring-link' : ''} ${drag === node.id ? 'opacity-40' : ''}`}
        >
          {zone === 'above' && <span className="absolute inset-x-0 top-0 h-0.5 bg-link" />}
          {zone === 'below' && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-link" />}
          {node.children.length ? (
            <button type="button" onClick={() => toggle(node.id)} aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${node.title}`} aria-expanded={isOpen} className={BUTTON}>
              <svg viewBox="0 0 20 20" className={`size-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="currentColor" aria-hidden>
                <path d="M7 4l6 6-6 6V4z" />
              </svg>
            </button>
          ) : (
            <span className="size-7 shrink-0" />
          )}
          {renaming === node.id ? (
            <input
              autoFocus
              defaultValue={node.title}
              aria-label={`Rename ${node.title}`}
              maxLength={80}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={(e) => rename(node.id, e.currentTarget.value)}
              onKeyDown={(e) => (e.key === 'Enter' ? e.currentTarget.blur() : e.key === 'Escape' && (e.currentTarget.value = node.title, e.currentTarget.blur()))}
              className="min-w-0 flex-1 rounded border border-line px-2 py-1 text-sm"
            />
          ) : (
            <span className="min-w-0 flex-1 cursor-grab truncate py-1.5 pr-2 text-sm" onDoubleClick={() => !busy && setRenaming(node.id)}>
              {node.title}
              <span className="block truncate text-xs text-muted sm:ml-2 sm:inline">{paths.has(node.id) ? `/${paths.get(node.id)}` : 'not on the site'}</span>
            </span>
          )}
          {here && !top && renaming !== node.id && (
            <span className="flex shrink-0 items-center">
              <button type="button" className={BUTTON} disabled={busy} onClick={() => setRenaming(node.id)} aria-label={`Rename ${node.title}`} title="Rename">✎</button>
              <button type="button" className={BUTTON} disabled={busy || !place('up')} onClick={() => move(node.id, place('up'))} aria-label="Move up" title="Move up">↑</button>
              <button type="button" className={BUTTON} disabled={busy || !place('down')} onClick={() => move(node.id, place('down'))} aria-label="Move down" title="Move down">↓</button>
              <button type="button" className={BUTTON} disabled={busy || !place('out')} onClick={() => move(node.id, place('out'))} aria-label="Move out, to the level above" title="Out one level">←</button>
              <button type="button" className={BUTTON} disabled={busy || !place('in')} onClick={() => move(node.id, place('in'))} aria-label="Move in, under the page above" title="In, under the page above">→</button>
            </span>
          )}
          {isOpen && !isSorted(node.children) && (
            <button type="button" disabled={busy} onClick={() => sort(node.id)} title="Put the pages under this one in alphabetical order" className="shrink-0 rounded border border-line px-2 py-0.5 text-xs text-muted hover:text-navy disabled:opacity-40">
              Sort A–Z
            </button>
          )}
          {paths.has(node.id) && (
            <Link {...(top ? { to: '/g' } : { to: '/g/$', params: { _splat: paths.get(node.id) ?? '' } })} className={`shrink-0 px-2 text-xs text-link hover:underline ${here ? 'hidden sm:block' : ''}`} aria-label={`Open ${node.title}`}>
              Open
            </Link>
          )}
        </div>
        {isOpen && node.children.length > 0 && (
          <ul>
            {node.children.map((c) => renderRow(c, depth + 1))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <h1 className="border-b border-line text-[28px] font-bold text-navy">Arrange pages</h1>
      <p className="mt-3 text-sm text-muted">
        Drag a page above or below another to put it there, or onto one to put it inside. Double-click a name to rename it. Addresses follow the names, and the old
        addresses keep leading to the page. A change reaches the site in about 20 seconds.
      </p>
      <div className="mt-3 flex items-center gap-3 text-sm">
        <button type="button" onClick={undoLast} disabled={busy || !undo.length} className="rounded-md border border-line px-3 py-1.5 disabled:opacity-40">
          Undo{undo.length ? ` (${undo.length})` : ''}
        </button>
        {error && <span role="alert" className="text-red-700">{error}</span>}
      </div>
      {index ? (
        <ul className="mt-4" inert={busy} aria-busy={busy} onDragLeave={(e) => e.currentTarget.contains(e.relatedTarget as Node) || setOver(undefined)}>
          {renderRow(index, 0)}
        </ul>
      ) : (
        !error && <p className="mt-4 text-muted">Loading…</p>
      )}
      {busy && (
        // Covers the page so nothing else can be started until the change is saved (a saved change takes a moment).
        <div role="status" className="fixed inset-0 z-50 grid cursor-progress place-items-center bg-black/30">
          <div className="flex items-center gap-3 rounded-lg bg-card text-navy px-5 py-3 text-sm shadow-lg">
            <span className="size-5 animate-spin rounded-full border-2 border-link border-t-transparent" aria-hidden />
            Saving…
          </div>
        </div>
      )}
    </div>
  )
}
