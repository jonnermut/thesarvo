import { imageUrl } from '#/guide/content/paths'
import type { Climb, ImageTopo, RoutePath, TopoRect } from '#/guide/model/types'
import { DASH, RECT_STYLES, ROUTE_COLOUR } from './topoStyles'
import { splitLines } from './text'

type Props = {
  guideId: string
  topo: ImageTopo
  climbs: Map<string, Climb>
  /** Climb id currently hovered/selected anywhere on the page. */
  active: string | null
  onActive: (climbId: string | null) => void
}

const numberLabel = (c?: Climb) => c?.number.replace(/\.$/, '') ?? ''

function Route({ path, climb, active, onActive }: { path: RoutePath; climb?: Climb; active: string | null; onActive: Props['onActive'] }) {
  const first = path.points[0]
  const last = path.points.at(-1)
  const dimmed = active !== null && active !== path.linkedTo
  const label = numberLabel(climb)
  return (
    <g
      opacity={dimmed ? 0.3 : 1}
      onPointerEnter={() => onActive(path.linkedTo || null)}
      onPointerLeave={() => onActive(null)}
      className="cursor-pointer"
    >
      {/* Wide invisible stroke makes thin lines easy to hover. */}
      <path d={path.d} fill="none" stroke="transparent" strokeWidth={16} vectorEffect="non-scaling-stroke" />
      <path d={path.d} fill="none" stroke="#000" strokeOpacity={0.55} strokeWidth={active === path.linkedTo ? 7 : 5} strokeLinecap="round" strokeDasharray={DASH[path.lineStyle]} vectorEffect="non-scaling-stroke" />
      <path
        d={path.d}
        fill="none"
        stroke={ROUTE_COLOUR}
        strokeWidth={active === path.linkedTo ? 4 : 2.5}
        strokeLinecap="round"
        strokeDasharray={DASH[path.lineStyle]}
        vectorEffect="non-scaling-stroke"
      />
      {last?.kind === 'belay' && <rect x={last.x - 5} y={last.y - 5} width={10} height={10} fill="#fff" stroke={ROUTE_COLOUR} strokeWidth={2} />}
      {last?.kind === 'lower' && <circle cx={last.x} cy={last.y} r={5} fill="#fff" stroke={ROUTE_COLOUR} strokeWidth={2} />}
      {first && label && (
        <>
          <circle cx={first.x} cy={first.y} r={11} fill="#fff" stroke={ROUTE_COLOUR} strokeWidth={2} />
          <text x={first.x} y={first.y} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700} fill="#000">
            {label}
          </text>
        </>
      )}
    </g>
  )
}

/** Little triangle on the rect edge, pointing the way the callout refers to. */
function arrowPoints(r: TopoRect): string | null {
  const cx = r.x + r.width / 2
  const cy = r.y + r.height / 2
  switch (r.arrowDirection) {
    case 'south': return `${cx - 6},${r.y + r.height} ${cx + 6},${r.y + r.height} ${cx},${r.y + r.height + 8}`
    case 'north': return `${cx - 6},${r.y} ${cx + 6},${r.y} ${cx},${r.y - 8}`
    case 'east': return `${r.x + r.width},${cy - 6} ${r.x + r.width},${cy + 6} ${r.x + r.width + 8},${cy}`
    case 'west': return `${r.x},${cy - 6} ${r.x},${cy + 6} ${r.x - 8},${cy}`
    default: return null
  }
}

function Callout({ rect }: { rect: TopoRect }) {
  const style = RECT_STYLES[rect.style] ?? RECT_STYLES.black_text_on_solid_white
  const lines = splitLines(rect.text)
  const lineHeight = 14
  const top = rect.y + rect.height / 2 - ((lines.length - 1) * lineHeight) / 2
  const arrow = arrowPoints(rect)
  return (
    <g>
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        rx={4}
        fill={style.fill}
        fillOpacity={0.9}
        stroke={style.stroke}
        strokeWidth={style.stroke === 'none' ? 0 : 2}
      />
      {arrow && <polygon points={arrow} fill={style.fill === 'none' ? style.stroke : style.fill} />}
      <text x={rect.x + rect.width / 2} textAnchor="middle" fontSize={12} fontFamily="Tahoma, Verdana, sans-serif" fill={style.text}>
        {lines.map((line, i) => (
          <tspan key={i} x={rect.x + rect.width / 2} y={top + i * lineHeight} dominantBaseline="central">
            {line.trim()}
          </tspan>
        ))}
      </text>
    </g>
  )
}

/** A photo with the route lines and callouts drawn over it as SVG. */
export function Topo({ guideId, topo, climbs, active, onActive }: Props) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-black/5 shadow-md">
      <img
        src={imageUrl(guideId, topo.src)}
        alt={topo.legendTitle || topo.src}
        width={topo.width}
        height={topo.height}
        loading="lazy"
        className="block h-auto w-full"
      />
      <svg viewBox={`0 0 ${topo.width} ${topo.height}`} className="absolute inset-0 size-full" role="img" aria-label="Route lines">
        {topo.paths.map((path) => (
          <Route key={path.id} path={path} climb={climbs.get(path.linkedTo)} active={active} onActive={onActive} />
        ))}
        {topo.rects.map((rect) => (
          <Callout key={rect.id} rect={rect} />
        ))}
      </svg>
    </div>
  )
}
