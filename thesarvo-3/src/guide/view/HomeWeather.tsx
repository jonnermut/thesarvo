import { Link } from '@tanstack/react-router'
import { PLACES } from '#/weather/places'
import { PlaceCard } from '#/weather/WeatherPanel'
import { useRotation } from './useRotation'

const WEATHER_SECONDS = 12

/** One place's weather under the hero, rotating through the Weather page's places. */
export function HomeWeather() {
  const { at, hold, step } = useRotation(PLACES.length, WEATHER_SECONDS)
  return (
    <section aria-label="Weather" className="mt-6 min-w-0" {...hold}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-bold text-navy">Weather</h2>
        <span className="flex gap-3 text-[13px]">
          <button type="button" onClick={() => step(1)} className="text-link hover:underline">
            Next area
          </button>
          <Link to="/g/$" params={{ _splat: 'more/weather' }} className="text-link hover:underline">
            All areas
          </Link>
        </span>
      </div>
      <PlaceCard place={PLACES[at]} />
    </section>
  )
}
