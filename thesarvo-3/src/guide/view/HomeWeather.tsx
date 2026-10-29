import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { Weather } from '#/weather/bom'
import { iconKind, WeatherIcon } from '#/weather/icons'
import { PLACES } from '#/weather/places'
import type { Place } from '#/weather/places'
import { deg, loadWeather, PlaceCard } from '#/weather/WeatherPanel'
import { useRotation } from './useRotation'

const WEATHER_SECONDS = 8
const KEY = 'thesarvo.weather'

/** The place a reader last picked, if any: the rotation starts there on their next visit. */
function remembered() {
  try {
    return PLACES.findIndex((p) => p.name === localStorage.getItem(KEY))
  } catch {
    return -1
  }
}

/**
 * One place's weather as a card among the contents cards, rotating through the Weather page's places.
 * Hovering (or focusing) the card stops the rotation and opens a strip of every place, each with today's high; picking one shows it,
 * remembers it, and carries the rotation on from there.
 */
export function HomeWeather() {
  const { at, held, hold, go, step } = useRotation(PLACES.length, WEATHER_SECONDS)
  useEffect(() => {
    const i = remembered()
    if (i >= 0) go(i)
  }, [go])
  const pick = (i: number) => {
    go(i)
    try {
      localStorage.setItem(KEY, PLACES[i].name)
    } catch {
      /* storage unavailable: the pick lasts until the page closes */
    }
  }
  const footer = (
    <p className="flex items-center justify-between gap-3 border-t border-line pt-2 text-[13px]">
      <button type="button" onClick={() => step(1)} className="text-link hover:underline">
        Next area
      </button>
      <span className="flex gap-1" aria-hidden>
        {PLACES.map((p, i) => (
          <span key={p.name} className={`size-1.5 rounded-full ${i === at ? 'bg-link' : 'bg-line'}`} />
        ))}
      </span>
      <Link to="/g/$" params={{ _splat: 'more/weather' }} className="text-link hover:underline">
        All areas
      </Link>
    </p>
  )
  return (
    <li aria-label="Weather" className="relative min-w-0" {...hold}>
      <PlaceCard place={PLACES[at]} footer={footer} />
      {held && (
        <div className="card absolute inset-x-0 bottom-0 z-10 p-2 shadow-lg">
          <ul className="grid grid-cols-5 gap-1">
            {PLACES.map((p, i) => (
              <Tile key={p.name} place={p} current={i === at} onPick={() => pick(i)} />
            ))}
          </ul>
          <p className="mt-2 flex justify-between border-t border-line pt-2 text-[13px]">
            <span className="text-muted">Pick an area to start there</span>
            <Link to="/g/$" params={{ _splat: 'more/weather' }} className="text-link hover:underline">
              All areas
            </Link>
          </p>
        </div>
      )}
    </li>
  )
}

/** A place's icon and high for today. The forecasts load when the strip first opens, then stay cached. */
function Tile({ place, current, onPick }: { place: Place; current: boolean; onPick: () => void }) {
  const [weather, setWeather] = useState<Weather>()
  useEffect(() => {
    let live = true
    loadWeather(place).then(
      (w) => live && setWeather(w),
      () => {},
    )
    return () => {
      live = false
    }
  }, [place])
  const today = weather?.days[0]
  const kind = today && iconKind(today.icon)
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        aria-current={current}
        className={`flex h-full w-full flex-col items-center rounded px-0.5 py-1 text-center hover:bg-paper ${current ? 'bg-paper ring-1 ring-link' : ''}`}
      >
        <span className="grid h-6 place-items-center">{kind ? <WeatherIcon kind={kind} className="size-6" /> : null}</span>
        <span className="text-xs font-semibold">{today ? deg(today.max) : '–'}</span>
        <span className="line-clamp-2 text-[10px] leading-tight text-muted">{place.name.split(' / ')[0]}</span>
      </button>
    </li>
  )
}
