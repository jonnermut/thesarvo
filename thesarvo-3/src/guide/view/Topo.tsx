import { useEffect, useRef, useState } from 'react'
import { pathData } from '#/guide/model/geometry'
import { imageUrl } from '#/guide/content/paths'
import type { Climb, ImageTopo, RoutePath, TopoRect } from '#/guide/model/types'
import { DASH, MARKER_NAVY, RECT_STYLES, ROUTE_COLOUR } from './topoStyles'
import { splitLines } from './text'
import { isSport } from './routeStats'

const SPORT_RED = '#c8102e'

type Props = {
  guideId: string
  topo: ImageTopo
  climbs: Map<string, Climb>
  /** Climb id currently hovered/selected anywhere on the page. */
  active: string | null
  onActive: (climbId: string | null) => void
  /** Called when a route is clicked or tapped, to show its climb. */
  onOpen?: (climbId: string) => void
}

const numberLabel = (c?: Climb) => c?.number.replace(/\.$/, '') ?? ''

export function Route({ path, climb, active, onActive, onOpen, scale = 1 }: { path: RoutePath; climb?: Climb; active: string | null; onActive: Props['onActive']; onOpen?: Props['onOpen']; scale?: number }) {
  const first = path.points[0]
  const last = path.points.at(-1)
  // A point of kind "label" says where the number goes; otherwise it sits on the first point.
  const at = path.points.find((p) => p.kind === 'label') ?? first
  const prev = path.points.findLast((p) => last && (p.x !== last.x || p.y !== last.y))
  const endMarker = last?.kind === 'belay' || last?.kind.startsWith('lower')
  const dimmed = active !== null && active !== path.linkedTo
  const label = numberLabel(climb)
  const d = path.d || pathData(path.points)
  return (
    <g
      opacity={dimmed ? 0.3 : 1}
      onPointerEnter={() => onActive(path.linkedTo || null)}
      onPointerLeave={() => onActive(null)}
      onClick={() => path.linkedTo && onOpen?.(path.linkedTo)}
      className="cursor-pointer"
    >
      {/* Wide invisible stroke makes thin lines easy to hover. */}
      <path d={d} fill="none" stroke="transparent" strokeWidth={16} vectorEffect="non-scaling-stroke" />
      <path d={d} fill="none" stroke="#000" strokeOpacity={0.35} strokeWidth={active === path.linkedTo ? 7 : 5} strokeLinecap="round" strokeDasharray={DASH[path.lineStyle]} vectorEffect="non-scaling-stroke" />
      <path
        d={d}
        fill="none"
        stroke={ROUTE_COLOUR}
        strokeWidth={active === path.linkedTo ? 4.5 : 3}
        strokeLinecap="round"
        strokeDasharray={DASH[path.lineStyle]}
        vectorEffect="non-scaling-stroke"
      />
      {path.arrow && !endMarker && last && prev && (
        <polygon
          points="-6,-6 6,0 -6,6"
          fill={ROUTE_COLOUR}
          stroke="#000"
          strokeOpacity={0.35}
          strokeWidth={1}
          transform={`translate(${last.x} ${last.y}) rotate(${(Math.atan2(last.y - prev.y, last.x - prev.x) * 180) / Math.PI}) scale(${scale})`}
        />
      )}
      {last && endMarker && <EndMarker kind={last.kind} x={last.x} y={last.y} scale={scale} />}
      {at && label && (
        <>
          <circle cx={at.x} cy={at.y} r={11 * scale} fill={climb && isSport(climb.extra) ? SPORT_RED : '#000'} />
          <text x={at.x} y={at.y} textAnchor="middle" dominantBaseline="central" fontSize={(label.length > 2 ? 9 : 11) * scale} fontWeight={700} fill="#fff">
            {label}
          </text>
        </>
      )}
    </g>
  )
}

/** Belay dot, or the legacy "lower off" pin (a ring on a stem with a down arrow), tilted for lower-left/right. */
const LOWER_PIN = 'M4,20h12l-16,20l-16,-20h12v-12.55c-8.239,-2.7,-14,-9.76,-14,-18.179c0,-9.94,8.05,-17.99,18,-17.99c9.939,0,18,8.05,18,18.57c0,8.88,-6.419,16.25,-14.859,17.73v12.55z'
const LOWER_TILT: Record<string, number> = { lower: 0, 'lower-left': 30, 'lower-right': -30 }

function EndMarker({ kind, x, y, scale }: { kind: string; x: number; y: number; scale: number }) {
  if (kind === 'belay') return <circle cx={x} cy={y} r={7 * scale} fill={MARKER_NAVY} stroke="#fff" strokeWidth={2} />
  return (
    <path
      d={LOWER_PIN}
      fill={MARKER_NAVY}
      stroke="#fff"
      strokeWidth={2 / 0.4}
      strokeLinejoin="round"
      transform={`translate(${x} ${y}) rotate(${LOWER_TILT[kind] ?? 0}) scale(${0.4 * scale}) translate(0 -5.65)`}
    />
  )
}

/** Legacy callouts point with a 30px line from the rect edge (or corner) towards the thing they refer to. */
const ARROW_LEN = 30
const ARROW_VECTORS: Record<string, [number, number]> = {
  north: [0, -1], north_east: [1, -1], east: [1, 0], south_east: [1, 1],
  south: [0, 1], south_west: [-1, 1], west: [-1, 0], north_west: [-1, -1],
}

function arrowLine(r: TopoRect) {
  const v = ARROW_VECTORS[r.arrowDirection]
  if (!v) return null
  const [dx, dy] = v
  const x1 = r.x + (dx < 0 ? 0 : dx > 0 ? r.width : r.width / 2)
  const y1 = r.y + (dy < 0 ? 0 : dy > 0 ? r.height : r.height / 2)
  return { x1, y1, x2: x1 + dx * ARROW_LEN, y2: y1 + dy * ARROW_LEN, angle: (Math.atan2(dy, dx) * 180) / Math.PI }
}

export function Callout({ rect }: { rect: TopoRect }) {
  const style = RECT_STYLES[rect.style] ?? RECT_STYLES.black_text_on_solid_white
  const lines = splitLines(rect.text)
  const lineHeight = 14
  const top = rect.y + rect.height / 2 - ((lines.length - 1) * lineHeight) / 2
  const arrow = arrowLine(rect)
  const colour = style.fill === 'none' ? style.stroke : style.fill
  return (
    <g>
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        rx={4}
        fill={style.fill}
        fillOpacity={1}
        stroke={style.stroke}
        strokeWidth={style.stroke === 'none' ? 0 : 2}
      />
      {arrow && (
        <g stroke={colour} fill={colour}>
          <line x1={arrow.x1} y1={arrow.y1} x2={arrow.x2} y2={arrow.y2} strokeWidth={4} />
          <polygon points="0,-7 14,0 0,7" stroke="none" transform={`translate(${arrow.x2} ${arrow.y2}) rotate(${arrow.angle})`} />
        </g>
      )}
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
export function Topo({ guideId, topo, climbs, active, onActive, onOpen }: Props) {
  // Markers are sized in photo pixels, so on a phone they would shrink to specks: grow them to stay legible.
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const node = box.current
    if (!node) return
    const update = () => setScale(Math.min(2.2, Math.max(1, 8 / ((11 * node.clientWidth) / topo.width))))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [topo.width])

  return (
    <div ref={box} className="relative overflow-hidden bg-black/5">
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
          <Route key={path.id} path={path} climb={climbs.get(path.linkedTo)} active={active} onActive={onActive} onOpen={onOpen} scale={scale} />
        ))}
        {topo.rects.map((rect) => (
          <Callout key={rect.id} rect={rect} />
        ))}
      </svg>
    </div>
  )
}
