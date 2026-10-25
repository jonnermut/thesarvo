/** Walk / Sun / Rock icons for the guide header: a dark tile with a white glyph, as on the live guide. */
const TILE = '#2b3a42'

function Tile({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 64 64" className="size-16 shrink-0" role="img" aria-label={label}>
      <rect width={64} height={64} fill={TILE} />
      {children}
      <text x={60} y={60} textAnchor="end" fontSize={15} fontWeight={700} fill="#fff" fontFamily="Helvetica, Arial, sans-serif">
        {label}
      </text>
    </svg>
  )
}

export function WalkIcon() {
  return (
    <Tile label="Walk">
      <g fill="#fff">
        <circle cx={34} cy={11} r={5} />
        <path d="M27 20l9-2 6 10 6 3-2 5-9-3-3-5-3 9 8 8v10h-6V50l-9-8-4 10h-6l6-18 3-9z" />
        <path d="M24 22l-8 5 3 5 7-5z" />
        <path d="M50 22l-1 28h-3l1-28z" />
      </g>
    </Tile>
  )
}

export function SunIcon() {
  const rays = Array.from({ length: 12 }, (_, i) => i * 30)
  return (
    <Tile label="Sun">
      <rect width={64} height={64} fill="#f7c23e" />
      <g transform="translate(18 20)" fill="#f7941e">
        {rays.map((a) => (
          <path key={a} d="M-3 -9L0 -22L3 -9z" transform={`rotate(${a})`} />
        ))}
        <circle r={9} fill="#fff" opacity={0.95} />
      </g>
      <path d="M0 64V36l30 28z" fill={TILE} />
    </Tile>
  )
}

export function RockIcon() {
  return (
    <Tile label="Rock">
      <g fill="#fff">
        <circle cx={22} cy={12} r={5} />
        <path d="M14 20l12-2 4 8-6 6 8 8-4 4-12-9-2-8 4-4z" />
        <path d="M30 18l10-8 3 3-9 9z" />
      </g>
      <path d="M44 8l14 30-10 12-14-4z" fill="#fff" opacity={0.25} />
    </Tile>
  )
}
