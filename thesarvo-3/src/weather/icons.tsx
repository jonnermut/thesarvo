export type Kind = 'sun' | 'partly' | 'cloud' | 'haze' | 'drizzle' | 'shower' | 'rain' | 'storm' | 'fog' | 'snow' | 'wind' | 'frost'

/** The Bureau's icon names (sunny, mostly_sunny, light_shower ...) as the few pictures drawn here. */
export function iconKind(descriptor: string): Kind | undefined {
  const d = descriptor.replace(/^(mostly_|partly_)?clear$/, 'sunny')
  if (!d) return undefined
  if (d.includes('storm') || d.includes('thunder')) return d.includes('cyclone') ? 'wind' : 'storm'
  if (d.includes('snow') || d.includes('sleet') || d.includes('hail')) return 'snow'
  if (d.includes('frost')) return 'frost'
  if (d.includes('fog')) return 'fog'
  if (d.includes('haze') || d.includes('dust') || d.includes('smoke')) return 'haze'
  if (d.includes('drizzle') || d === 'light_rain') return 'drizzle'
  if (d.includes('shower')) return 'shower'
  if (d.includes('rain')) return 'rain'
  if (d.includes('wind') || d.includes('cyclone')) return 'wind'
  if (d === 'cloudy' || d === 'overcast') return 'cloud'
  if (d === 'partly_cloudy' || d === 'mostly_cloudy') return 'partly'
  if (d === 'mostly_sunny') return 'partly'
  if (d === 'sunny') return 'sun'
  return undefined
}

const SUN = 'text-amber-deep'
const CLOUD = 'M7 17a4 4 0 0 1-.3-8 5 5 0 0 1 9.6 1.2A3.4 3.4 0 0 1 16.5 17Z'

/** A small weather picture in the colours of the page; the text beside it carries the meaning, so it is hidden from screen readers. */
export function WeatherIcon({ kind, className = 'size-8' }: { kind: Kind; className?: string }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  const sun = (cx: number, cy: number, r: number) => (
    <g className={SUN} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none">
      <circle cx={cx} cy={cy} r={r} fill="currentColor" fillOpacity=".25" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line key={a} x1={cx} y1={cy - r - 2} x2={cx} y2={cy - r - 4.5} transform={`rotate(${a} ${cx} ${cy})`} />
      ))}
    </g>
  )
  const drops = (xs: number[], y = 19) => <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-link">{xs.map((x) => <line key={x} x1={x} y1={y} x2={x - 1} y2={y + 2.5} />)}</g>
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {kind === 'sun' && sun(12, 12, 4.5)}
      {kind === 'partly' && (
        <>
          {sun(9, 8.5, 3.2)}
          <path d={CLOUD} transform="translate(1.5 1)" {...stroke} className="text-muted" fill="var(--color-card, white)" />
        </>
      )}
      {kind === 'cloud' && <path d={CLOUD} {...stroke} className="text-muted" />}
      {kind === 'haze' && (
        <g {...stroke} className="text-muted">
          <path d="M4 9h16M6 13h14M4 17h12" />
        </g>
      )}
      {kind === 'fog' && (
        <g {...stroke} className="text-muted">
          <path d="M7 11a4 4 0 0 1 .5-3.5A5 5 0 0 1 16.500 8 3 3 0 0 1 17 11M4 14h16M6 17.500h12" />
        </g>
      )}
      {(kind === 'drizzle' || kind === 'shower' || kind === 'rain') && (
        <>
          <path d={CLOUD} transform="translate(0 -3)" {...stroke} className="text-muted" />
          {drops(kind === 'drizzle' ? [10, 14] : kind === 'shower' ? [9, 13, 17] : [8, 11.500, 15, 18], kind === 'rain' ? 16 : 16.500)}
        </>
      )}
      {kind === 'storm' && (
        <>
          <path d={CLOUD} transform="translate(0 -3)" {...stroke} className="text-muted" />
          <path d="m12.500 13-2.500 4h3l-2 4" {...stroke} className={SUN} />
        </>
      )}
      {kind === 'snow' && (
        <g {...stroke} className="text-link">
          <path d="M12 3v18M4.500 7.500l15 9M19.500 7.500l-15 9" />
        </g>
      )}
      {kind === 'frost' && (
        <g {...stroke} className="text-link">
          <path d="M12 3v18M4.500 7.500l15 9M19.500 7.500l-15 9M9 4.500l3 2 3-2M9 19.500l3-2 3 2" />
        </g>
      )}
      {kind === 'wind' && (
        <g {...stroke} className="text-muted">
          <path d="M3 9h11a2.500 2.500 0 1 0-2.500-2.500M3 13h15a2.500 2.500 0 1 1-2.500 2.500M3 17h8" />
        </g>
      )}
    </svg>
  )
}
