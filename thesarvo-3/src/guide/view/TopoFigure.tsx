import type { Climb, ImageTopo } from '#/guide/model/types'
import { Stars } from './Stars'
import { Topo } from './Topo'

type Props = {
  guideId: string
  topo: ImageTopo
  climbs: Map<string, Climb>
  active: string | null
  onActive: (climbId: string | null) => void
}

/**
 * Photo topo plus its legend. On wide photos the legend sits on the image like the live guide;
 * on narrow ones its text would be unreadably small, so it drops below the photo instead.
 */
export function TopoFigure(props: Props) {
  const { topo, climbs, active, onActive } = props
  const legend = topo.legend.map((id) => climbs.get(id)).filter((c): c is Climb => !!c)
  const hasLegend = legend.length > 0

  const rows = (compact: boolean) =>
    legend.map((c) => (
      <li key={c.id} onPointerEnter={() => onActive(c.id)} onPointerLeave={() => onActive(null)}>
        <a
          href={`#climb-${c.id}`}
          className={`grid grid-cols-[1.2em_2.2em_1fr_auto] items-baseline gap-x-[0.5em] px-[0.4em] ${compact ? 'py-0' : 'py-1'} ${active === c.id ? 'bg-amber/60 text-black' : ''}`}
        >
          <span className="text-center"><Stars stars={c.stars} /></span>
          <span className="text-right tabular-nums">{c.number}</span>
          <span className="truncate">{c.name}</span>
          <span className="tabular-nums">{c.grade}</span>
        </a>
      </li>
    ))

  return (
    <figure className="@container my-3">
      <div className="relative">
        <Topo {...props} />
        {hasLegend && (
          <div
            className="absolute hidden rounded-lg bg-black/40 py-[0.3em] text-white @lg:block"
            style={{
              left: `${(topo.legendX / topo.width) * 100}%`,
              top: `${(topo.legendY / topo.height) * 100}%`,
              fontSize: `${(10 / topo.width) * 100}cqw`,
              minWidth: '19%',
            }}
          >
            {topo.legendTitle && <p className="px-[0.6em] pb-[0.3em] text-center font-bold">{topo.legendTitle}</p>}
            <ol className="leading-[1.2]">{rows(true)}</ol>
          </div>
        )}
      </div>
      {hasLegend && (
        <figcaption className="@lg:hidden mt-2 border border-line p-2 text-[13px]">
          {topo.legendTitle && <p className="mb-1 font-bold">{topo.legendTitle}</p>}
          <ol>{rows(false)}</ol>
        </figcaption>
      )}
      {topo.legendFooter && <p className="mt-1 text-[11px] text-muted">{topo.legendFooter}</p>}
    </figure>
  )
}
