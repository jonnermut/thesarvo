import type { RouteStats } from './routeStats'

const W = 280
const H = 190
const PLOT = { left: 34, right: 8, top: 34, bottom: 44 }

/** Stacked bar chart of route counts per grade band, drawn as SVG so it scales and prints crisply. */
export function RoutesChart({ stats }: { stats: RouteStats }) {
  const peak = Math.max(1, ...stats.bands.map((b) => b.trad + b.sport))
  const step = peak > 100 ? 50 : peak > 40 ? 25 : peak > 16 ? 10 : 5
  const max = Math.ceil(peak / step) * step
  const innerW = W - PLOT.left - PLOT.right
  const innerH = H - PLOT.top - PLOT.bottom
  const y = (n: number) => PLOT.top + innerH - (n / max) * innerH
  const slot = innerW / stats.bands.length
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${stats.total} routes by grade`} className="w-full max-w-72 text-[11px]">
      <text x={W / 2} y={18} textAnchor="middle" fontSize={16} fontWeight={700} fontFamily="Helvetica, Tahoma, Arial, sans-serif">
        {stats.total} Routes
      </text>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PLOT.left} x2={W - PLOT.right} y1={y(t)} y2={y(t)} stroke="#000" strokeOpacity={0.12} />
          <text x={PLOT.left - 5} y={y(t)} textAnchor="end" dominantBaseline="central">{t}</text>
        </g>
      ))}
      {stats.bands.map((b, i) => {
        const x = PLOT.left + i * slot + slot * 0.12
        const w = slot * 0.76
        return (
          <g key={b.band}>
            <rect x={x} y={y(b.trad)} width={w} height={y(0) - y(b.trad)} fill="#000" />
            <rect x={x} y={y(b.trad + b.sport)} width={w} height={y(b.trad) - y(b.trad + b.sport)} fill="#f0605d" />
            <text x={x + w / 2} y={y(0) + 13} textAnchor="middle">{b.band}</text>
          </g>
        )
      })}
      <g transform={`translate(${W / 2 - 52} ${H - 18})`}>
        <rect width={96} height={16} fill="#fff" stroke="#000" strokeOpacity={0.3} />
        <rect x={6} y={4} width={8} height={8} fill="#000" />
        <text x={17} y={8} dominantBaseline="central">Trad</text>
        <rect x={52} y={4} width={8} height={8} fill="#f0605d" />
        <text x={63} y={8} dominantBaseline="central">Sport</text>
      </g>
    </svg>
  )
}
