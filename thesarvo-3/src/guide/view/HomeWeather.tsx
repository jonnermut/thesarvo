import { Link } from '@tanstack/react-router'
import { PLACES } from '#/weather/places'
import { PlaceCard } from '#/weather/WeatherPanel'
import { useRotation } from './useRotation'

const WEATHER_SECONDS = 12

/** One place's weather as a card among the contents cards, rotating through the Weather page's places. */
export function HomeWeather() {
  const { at, hold, step } = useRotation(PLACES.length, WEATHER_SECONDS)
  return (
    <li aria-label="Weather" className="flex min-w-0 flex-col gap-1" {...hold}>
      <PlaceCard place={PLACES[at]} />
      <p className="flex justify-end gap-3 text-[13px]">
        <button type="button" onClick={() => step(1)} className="text-link hover:underline">
          Next area
        </button>
        <Link to="/g/$" params={{ _splat: 'more/weather' }} className="text-link hover:underline">
          All areas
        </Link>
      </p>
    </li>
  )
}
