import { useEffect, useMemo, useState } from 'react'
import type { Climb, Guide, GuideNode } from '#/guide/model/types'
import { ClimbBlock } from './ClimbBlock'
import { nodeAnchors } from './contents'
import { restorePlace } from './place'
import { GuideContents } from './GuideContents'
import { guideTitle } from './kml'
import { GpsBlock } from './GpsBlock'
import { HeaderBlock } from './HeaderBlock'
import { TextBlock } from './TextBlock'
import { routeStats } from './routeStats'
import { legendRedundant, topoSection } from './section'
import { TopoFigure } from './TopoFigure'
import { widthClass } from './width'

/**
 * Read-only guide: renders every node in order. `hash` is the location's, which flashes the block it
 * names. At `full` width the text column fills the page too.
 */
export function GuideView({ guide, hash, full = false }: { guide: Guide; hash?: string; full?: boolean }) {
  // Hovering a route, legend row or climb highlights the other two.
  const [active, setActive] = useState<string | null>(null)
  const climbs = useMemo(
    () => new Map(guide.nodes.filter((n): n is Climb => n.type === 'climb' || n.type === 'problem').map((c) => [c.id, c])),
    [guide],
  )

  const stats = useMemo(() => routeStats([...climbs.values()]), [climbs])
  const anchors = useMemo(() => nodeAnchors(guide.nodes), [guide])
  const redundant = useMemo(
    () => new Set(guide.nodes.flatMap((n, i) => (n.type === 'image' && legendRedundant(n, topoSection(guide.nodes, i).climbs) ? [n.id] : []))),
    [guide],
  )

  useEffect(restorePlace, [])

  // `:target` flashes a linked block on a full load; links followed inside the app set no target, so flash it here.
  useEffect(() => {
    const el = hash ? document.getElementById(hash) : null
    if (!el) return
    el.classList.remove('arrived')
    void el.offsetWidth
    el.classList.add('arrived')
  }, [hash])

  const render = (node: GuideNode, anchor: string | undefined) => {
    switch (node.type) {
      case 'header':
        return <HeaderBlock header={node} stats={stats} />
      case 'climb':
      case 'problem':
        return <ClimbBlock climb={node} highlighted={active === node.id} anchor={anchor} />
      case 'text':
        return <TextBlock block={node} />
      case 'image':
        // A leftover topo with no photo (the old site kept some) would show as a broken picture with a stray full-screen button.
        return !node.src ? null : <TopoFigure guideId={guide.id} topo={node} climbs={climbs} active={active} onActive={setActive} redundantLegend={redundant.has(node.id)} />
      case 'gps':
        return <GpsBlock gps={node} guideName={guideTitle(guide)} />
      case 'unknown':
        return null
    }
  }

  return (
    <div className={`mx-auto flex ${widthClass(full)} px-4 py-6 sm:px-6 xl:gap-8`}>
      <article className={`guide-width min-w-0 flex-1 space-y-2 wrap-break-word ${full ? 'max-w-full' : 'max-w-4xl'}`}>
        {guide.nodes.map((node, i) => {
          const climb = node.type === 'climb' || node.type === 'problem'
          // Each block is wrapped so it can be linked to (#c-173) and flashes when it is.
          return (
            <div
              key={anchors[i] ?? i}
              id={anchors[i]}
              data-node={node.type === 'unknown' ? undefined : node.id}
              className="anchor"
              hidden={node.type === 'unknown'}
              onPointerEnter={climb ? () => setActive(node.id) : undefined}
              onPointerLeave={climb ? () => setActive(null) : undefined}
            >
              {render(node, anchors[i])}
            </div>
          )
        })}
      </article>
      <GuideContents nodes={guide.nodes} />
    </div>
  )
}
