import { useMemo, useState } from 'react'
import type { Climb, Guide } from '#/guide/model/types'
import { ClimbBlock } from './ClimbBlock'
import { GpsBlock } from './GpsBlock'
import { HeaderBlock } from './HeaderBlock'
import { TextBlock } from './TextBlock'
import { TopoFigure } from './TopoFigure'

/** Read-only guide: renders every node in order. */
export function GuideView({ guide }: { guide: Guide }) {
  // Hovering a route, legend row or climb highlights the other two.
  const [active, setActive] = useState<string | null>(null)
  const climbs = useMemo(
    () => new Map(guide.nodes.filter((n): n is Climb => n.type === 'climb' || n.type === 'problem').map((c) => [c.id, c])),
    [guide],
  )

  return (
    <article className="mx-auto max-w-4xl space-y-2 px-4 py-6 sm:px-6">
      {guide.nodes.map((node, i) => {
        switch (node.type) {
          case 'header':
            return <HeaderBlock key={node.id} header={node} />
          case 'climb':
          case 'problem':
            return (
              <div key={node.id} onPointerEnter={() => setActive(node.id)} onPointerLeave={() => setActive(null)}>
                <ClimbBlock climb={node} highlighted={active === node.id} />
              </div>
            )
          case 'text':
            return <TextBlock key={node.id} block={node} />
          case 'image':
            return <TopoFigure key={node.id} guideId={guide.id} topo={node} climbs={climbs} active={active} onActive={setActive} />
          case 'gps':
            return <GpsBlock key={node.id} gps={node} />
          case 'unknown':
            return <div key={i} hidden />
        }
      })}
    </article>
  )
}
