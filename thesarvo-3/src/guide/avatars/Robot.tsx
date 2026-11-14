import { useId } from 'react'

/** The site's own bots, by the `sub` their history entries carry: drawn here, so no picture file is needed. */
export type Bot = 'climber' | 'sync'
const BOTS = new Map<string, Bot>([
  ['thesarvo-bot', 'climber'],
  ['thecrag-sync', 'sync'],
])

export const botFor = (ids: readonly string[]): Bot | undefined => ids.map((id) => BOTS.get(id)).find(Boolean)

/** A robot face: thesarvo bot wears a climbing helmet with a headlamp; theCrag sync has an antenna and sync arrows. */
export function Robot({ bot, className }: { bot: Bot; className?: string }) {
  const climber = bot === 'climber'
  const clip = useId()
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={`${className} shrink-0 rounded-full`}>
      <clipPath id={clip}>
        <circle cx="24" cy="24" r="24" />
      </clipPath>
      <circle cx="24" cy="24" r="24" fill={climber ? '#1b1464' : '#0b6e78'} />
      <g clipPath={`url(#${clip})`}>
        {/* body and neck */}
        <rect x="21" y="30" width="6" height="5" fill="#9fb0c8" />
        <rect x="11" y="34" width="26" height="18" rx="6" fill="#e8edf5" />
        {climber ? (
          <>
            {/* harness and a carabiner */}
            <path d="M11 41h26" stroke="#f7941e" strokeWidth="2.5" />
            <g transform="rotate(-25 24 42.5)" fill="none" stroke="#5a45b5" strokeWidth="1.5" strokeLinecap="round">
              <path d="M21.6 41.5v-1.2a2.4 2.4 0 0 1 4.8 0v4.4a2.4 2.4 0 0 1-4.8 0" />
              <path d="M21.6 43.5l0.9-2.6" />
            </g>
          </>
        ) : (
          <g fill="none" stroke="#0b6e78" strokeWidth="1.6" strokeLinecap="round">
            <path d="M20.5 40a3.5 3.5 0 0 1 6-2.3M27.5 42a3.5 3.5 0 0 1-6 2.3" />
            <path d="M26.8 35.6v2.4h-2.4M21.2 46.4v-2.4h2.4" />
          </g>
        )}
      </g>
      {/* ears */}
      <rect x="9" y="19" width="3.5" height="7" rx="1.5" fill="#9fb0c8" />
      <rect x="35.5" y="19" width="3.5" height="7" rx="1.5" fill="#9fb0c8" />
      {climber ? null : (
        <>
          <path d="M24 13V8" stroke="#9fb0c8" strokeWidth="1.8" />
          <circle cx="24" cy="7" r="2.3" fill="#f7941e" />
        </>
      )}
      {/* head, visor, eyes and mouth */}
      <rect x="12" y="12" width="24" height="20" rx="6" fill="#e8edf5" />
      <rect x="15" y="17" width="18" height="8" rx="4" fill="#172b4d" />
      <circle cx="20" cy="21" r="2" fill="#5bbfc9" />
      <circle cx="28" cy="21" r="2" fill="#5bbfc9" />
      <circle cx="20.6" cy="20.4" r="0.6" fill="#fff" />
      <circle cx="28.6" cy="20.4" r="0.6" fill="#fff" />
      <path d="M20 28.2h8" stroke="#9fb0c8" strokeWidth="1.4" strokeLinecap="round" />
      {climber && (
        <>
          {/* helmet with a headlamp */}
          <path d="M10.5 17.5C10.5 9 16.5 4.5 24 4.5S37.5 9 37.5 17.5Z" fill="#f7941e" />
          <path d="M10 17.5h28" stroke="#b45f06" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M17 7.5Q24 5 31 7.5" stroke="#fbb867" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <circle cx="24" cy="13" r="2.6" fill="#fff6d6" stroke="#b45f06" strokeWidth="0.8" />
        </>
      )}
    </svg>
  )
}
