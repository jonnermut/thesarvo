import type { Climb, ImageTopo } from '#/guide/model/types'
import { Topo } from './Topo'

type Props = {
  guideId: string
  topo: ImageTopo
  climbs: Map<string, Climb>
  active: string | null
  onActive: (climbId: string | null) => void
}

/** Photo topo plus its legend table. */
export function TopoFigure(props: Props) {
  const { topo, climbs, active, onActive } = props
  const legend = topo.legend.map((id) => climbs.get(id)).filter((c): c is Climb => !!c)
  return (
    <figure className="my-4">
      <Topo {...props} />
      {(legend.length > 0 || topo.legendTitle) && (
        <figcaption className="mt-3 rounded-lg border border-line bg-card p-3">
          {topo.legendTitle && <p className="mb-1 font-semibold">{topo.legendTitle}</p>}
          <ol className="grid gap-x-6 sm:grid-cols-2">
            {legend.map((c) => (
              <li key={c.id} onPointerEnter={() => onActive(c.id)} onPointerLeave={() => onActive(null)}>
                <a
                  href={`#climb-${c.id}`}
                  className={`flex items-baseline gap-2 rounded px-2 py-1 text-sm ${active === c.id ? 'bg-amber/25' : 'hover:bg-paper'}`}
                >
                  <span className="w-6 text-right font-semibold tabular-nums">{c.number}</span>
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="font-semibold text-muted">{c.grade}</span>
                </a>
              </li>
            ))}
          </ol>
          {topo.legendFooter && <p className="mt-1 text-xs text-muted">{topo.legendFooter}</p>}
        </figcaption>
      )}
    </figure>
  )
}
