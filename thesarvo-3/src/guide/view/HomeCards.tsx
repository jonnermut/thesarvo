import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { Classic } from '#/guide/content/classics'
import { guideUrl } from '#/guide/content/paths'
import { fetchClassics } from '#/guide/server'
import { PLACES } from '#/weather/places'
import { PlaceCard } from '#/weather/WeatherPanel'
import { Stars } from './Stars'

const WEATHER_SECONDS = 12
const CLASSICS_SECONDS = 9
const CLASSICS_SHOWN = 5

/** Steps through `count` things every `seconds`, starting at a random one. Holds still while the pointer or focus is on it, and for people who ask for less motion. */
function useRotation(count: number, seconds: number) {
  const [at, setAt] = useState(0)
  const [held, setHeld] = useState(false)
  useEffect(() => setAt(Math.floor(Math.random() * count)), [count])
  useEffect(() => {
    if (held || count < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setAt((a) => (a + 1) % count), seconds * 1000)
    return () => clearInterval(t)
  }, [held, count, seconds])
  const hold = { onMouseEnter: () => setHeld(true), onMouseLeave: () => setHeld(false), onFocus: () => setHeld(true), onBlur: () => setHeld(false) }
  return { at, hold, step: (by: number) => setAt((a) => (a + by + count) % count) }
}

const shuffled = <T,>(items: T[]) => items.map((item) => [Math.random(), item] as const).sort((a, b) => a[0] - b[0]).map(([, item]) => item)

/** Two cards side by side under the hero: a place's weather and some of the best climbs, each rotating. */
export function HomeCards() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <WeatherCard />
      <ClassicsCard />
    </div>
  )
}

function Heading({ title, link, to, children }: { title: string; link?: string; to?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h2 className="text-[17px] font-bold text-navy">{title}</h2>
      <span className="flex gap-3 text-[13px]">
        {children}
        {link && to && (
          <Link to="/g/$" params={{ _splat: to }} className="text-link hover:underline">
            {link}
          </Link>
        )}
      </span>
    </div>
  )
}

function WeatherCard() {
  const { at, hold, step } = useRotation(PLACES.length, WEATHER_SECONDS)
  return (
    <section aria-label="Weather" className="min-w-0" {...hold}>
      <Heading title="Weather" link="All areas" to="more/weather">
        <button type="button" onClick={() => step(1)} className="text-link hover:underline">
          Next area
        </button>
      </Heading>
      <PlaceCard place={PLACES[at]} />
    </section>
  )
}

function ClassicsCard() {
  const [classics, setClassics] = useState<Classic[]>([])
  useEffect(() => {
    let live = true
    fetchClassics().then(
      (c) => live && setClassics(shuffled(c)),
      () => {
        /* no list: the card stays out */
      },
    )
    return () => {
      live = false
    }
  }, [])
  const pages = Math.ceil(classics.length / CLASSICS_SHOWN)
  const { at, hold, step } = useRotation(pages, CLASSICS_SECONDS)
  if (!classics.length) return null
  return (
    <section aria-label="Classic climbs" className="min-w-0" {...hold}>
      <Heading title="Classic climbs">
        <button type="button" onClick={() => step(1)} className="text-link hover:underline">
          Show others
        </button>
      </Heading>
      <ul className="card h-full divide-y divide-line/60 px-3 py-1">
        {classics.slice(at * CLASSICS_SHOWN, (at + 1) * CLASSICS_SHOWN).map((c) => (
          <li key={`${c.path}#${c.anchor}`} className="py-2">
            <div className="flex items-baseline justify-between gap-3">
              <Link to={guideUrl(c)} hash={c.anchor} className="min-w-0 font-semibold text-link hover:underline">
                {c.name}
              </Link>
              <span className="flex shrink-0 items-baseline gap-2 text-sm">
                <Stars stars="***" />
                <span className="font-semibold tabular-nums">{c.grade}</span>
              </span>
            </div>
            <div className="text-[13px] text-muted">{c.guide}</div>
          </li>
        ))}
      </ul>
    </section>
  )
}
