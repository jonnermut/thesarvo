import { Link } from '@tanstack/react-router'
import { PLACES } from '#/weather/places'
import { PlaceCard } from '#/weather/WeatherPanel'
import { useRotation } from './useRotation'

const WEATHER_SECONDS = 12

/** One place's weather as a card among the contents cards, rotating through the Weather page's places. */
export function HomeWeather() {
  const { at, hold, step } = useRotation(PLACES.length, WEATHER_SECONDS)
  return (
    <li aria-label="Weather" className="min-w-0" {...hold}>
      <PlaceCard
        place={PLACES[at]}
        footer={
          <p className="flex justify-between gap-3 border-t border-line pt-2 text-[13px]">
            <button type="button" onClick={() => step(1)} className="text-link hover:underline">
              Next area
            </button>
            <Link to="/g/$" params={{ _splat: 'more/weather' }} className="text-link hover:underline">
              All areas
            </Link>
          </p>
        }
      />
    </li>
  )
}
