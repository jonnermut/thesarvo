import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { guideUrl } from '#/guide/content/paths'
import type { IndexNode } from '#/guide/content/types'
import { fetchTree } from '#/guide/server'

type Placed = { node: IndexNode; parent?: IndexNode }
const guidesIn = (node: IndexNode, parent?: IndexNode): Placed[] => [
  ...(node.isGuide ? [{ node, parent }] : []),
  ...node.children.flatMap((c) => guidesIn(c, node)),
]

/**
 * The guides before and after this one in the tree, from the full tree once the page is live. One
 * in another area also names its parent, so "Articles" reads as part of the guide it belongs to.
 */
export function PrevNext({ id, width = 'max-w-6xl' }: { id: string; width?: string }) {
  const [around, setAround] = useState<[Placed | undefined, Placed | undefined]>()
  useEffect(() => {
    let live = true
    fetchTree()
      .then((tree) => {
        const guides = guidesIn(tree)
        const i = guides.findIndex((g) => g.node.id === id)
        if (live && i >= 0) {
          const own = guides[i].parent
          const placed = (g?: Placed) => g && { node: g.node, parent: g.parent === own ? undefined : g.parent }
          setAround([placed(guides[i - 1]), placed(guides[i + 1])])
        }
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [id])
  if (!around) return null
  const [prev, next] = around
  return (
    <nav aria-label="Other guides" className={`no-print mx-auto grid ${width} grid-cols-2 gap-3 px-4 pb-8 pt-2 sm:px-6`}>
      <div className="max-w-sm">{prev && <Neighbour {...prev} label="← Previous" />}</div>
      <div className="ml-auto max-w-sm text-right">{next && <Neighbour {...next} label="Next →" />}</div>
    </nav>
  )
}

function Neighbour({ node, parent, label }: Placed & { label: string }) {
  return (
    <Link to={guideUrl(node)} className="block rounded-md border border-line px-3 py-2 hover:bg-paper">
      <span className="block text-[12px] text-muted">{label}</span>
      {parent && <span className="block text-[12px] text-muted">{parent.title}</span>}
      <span className="font-medium text-link">{node.title}</span>
    </Link>
  )
}
