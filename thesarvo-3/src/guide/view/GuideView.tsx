import { useMemo, useState } from 'react'
import type { Climb, Guide, GuideNode } from '#/guide/model/types'
import { ClimbBlock } from './ClimbBlock'
import { nodeAnchors } from './contents'
import { GuideContents } from './GuideContents'
import { guideTitle } from './kml'
import { GpsBlock } from './GpsBlock'
import { HeaderBlock } from './HeaderBlock'
import { TextBlock } from './TextBlock'
import { routeStats } from './routeStats'
import { TopoFigure } from './TopoFigure'

/** Read-only guide: renders every node in order. */
export function GuideView({ guide }: { guide: Guide }) {
  // Hovering a route, legend row or climb highlights the other two.
  const [active, setActive] = useState<string | null>(null)
  const climbs = useMemo(
    () => new Map(guide.nodes.filter((n): n is Climb => n.type === 'climb' || n.type === 'problem').map((c) => [c.id, c])),
    [guide],
  )

  const stats = useMemo(() => routeStats([...climbs.values()]), [climbs])
  const anchors = useMemo(() => nodeAnchors(guide.nodes), [guide])

  const render = (node: GuideNode) => {
    switch (node.type) {
      case 'header':
        return <HeaderBlock header={node} stats={stats} />
      case 'climb':
      case 'problem':
        return <ClimbBlock climb={node} highlighted={active === node.id} />
      case 'text':
        return <TextBlock block={node} />
      case 'image':
        return <TopoFigure guideId={guide.id} topo={node} climbs={climbs} active={active} onActive={setActive} />
      case 'gps':
        return <GpsBlock gps={node} guideName={guideTitle(guide)} />
      case 'unknown':
        return null
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl px-4 py-6 sm:px-6 xl:gap-8">
      <article className="min-w-0 max-w-4xl flex-1 space-y-2 wrap-break-word">
        {guide.nodes.map((node, i) => {
          const climb = node.type === 'climb' || node.type === 'problem'
          // Each block is wrapped so it can be linked to (#c-173) and flashes when it is.
          return (
            <div
              key={anchors[i] ?? i}
              id={anchors[i]}
              className="anchor"
              hidden={node.type === 'unknown'}
              onPointerEnter={climb ? () => setActive(node.id) : undefined}
              onPointerLeave={climb ? () => setActive(null) : undefined}
            >
              {render(node)}
            </div>
          )
        })}
      </article>
      <GuideContents nodes={guide.nodes} />
    </div>
  )
}
