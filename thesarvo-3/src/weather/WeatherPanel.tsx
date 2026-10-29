import { useEffect, useState } from 'react'
import { fetchWeather } from './bom'
import type { Day, Weather } from './bom'
import { iconKind, WeatherIcon } from './icons'
import { bomForecastUrl, bomStationUrl, PLACES, swellUrl } from './places'
import type { Place } from './places'

const TZ = 'Australia/Hobart'
const weekday = (iso: string) => new Date(iso).toLocaleDateString('en-AU', { weekday: 'short', timeZone: TZ })
const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', timeZone: TZ })
const deg = (n: number | null) => (n === null ? '–' : `${Math.round(n)}°`)

type State = { weather: Weather } | { error: true } | undefined

/** Forecasts and the latest observations for where Tasmanian climbers go, straight from the Bureau of Meteorology in the browser. */
export function WeatherPanel() {
  return (
    <section aria-labelledby="climbing-weather" className="mt-8">
      <h2 id="climbing-weather" className="border-b border-line pb-1 text-[22px] font-bold text-navy">
        Weather where we climb
      </h2>
      <p className="mt-2 text-sm text-muted">
        Today and the week ahead for the main climbing areas, with the latest reading from the nearest weather station. Wind is what usually decides a day, so read the text. Mountain and coastal conditions can differ a lot from the town forecast.
      </p>
      <ul className="mt-4 grid gap-4 lg:grid-cols-2">
        {PLACES.map((p) => (
          <li key={p.name} className="min-w-0">
            <PlaceCard place={p} />
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted">
        Forecasts and observations © Commonwealth of Australia, Bureau of Meteorology, loaded in your browser from <a className="underline hover:text-navy" href="https://www.bom.gov.au/tas/">bom.gov.au</a>. Times are Tasmanian time.
      </p>
    </section>
  )
}

/** One fetch per place for as long as the page lives, so a card that rotates back into view does not ask again. */
const loaded = new Map<string, Promise<Weather>>()
function loadWeather(p: Place) {
  let w = loaded.get(p.name)
  if (!w) {
    w = fetchWeather(p)
    loaded.set(p.name, w)
    w.catch(() => loaded.delete(p.name))
  }
  return w
}

export function PlaceCard({ place }: { place: Place }) {
  const [state, setState] = useState<State>()
  useEffect(() => {
    let live = true
    loadWeather(place).then(
      (weather) => live && setState({ weather }),
      () => live && setState({ error: true }),
    )
    return () => {
      live = false
    }
  }, [place])
  const weather = state && 'weather' in state ? state.weather : undefined
  const today = weather?.days[0]
  const now = weather?.now
  return (
    <div className="card h-full p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="text-[17px] font-semibold text-navy">{place.name}</h3>
        <span className="flex gap-3 text-[13px]">
          <a href={bomForecastUrl(place)} className="text-link hover:underline" title="The Bureau's forecast for this place">
            Forecast
          </a>
          {place.swell && (
            <a href={swellUrl(place)} className="text-link hover:underline" title="Swell and waves on Windy">
              Swell
            </a>
          )}
          {now?.stationId && (
            <a href={bomStationUrl(now.stationId)} className="text-link hover:underline" title={`${now.station} weather station, on the Bureau's site`}>
              Observations
            </a>
          )}
        </span>
      </div>
      <p className="text-[13px] text-muted">{place.note}</p>
      {!state && <p className="mt-3 text-sm text-muted">Loading…</p>}
      {state && 'error' in state && (
        <p className="mt-3 text-sm text-muted">
          The Bureau's forecast could not be loaded. Try <a className="text-link hover:underline" href="https://www.bom.gov.au/tas/forecasts/map.shtml">its forecast map</a>.
        </p>
      )}
      {now && (
        <p className="mt-3 text-sm">
          <strong>Now{now.temp !== null && `: ${now.temp.toFixed(0)}°`}</strong>
          {now.feels !== null && now.temp !== null && Math.abs(now.feels - now.temp) >= 3 && <span> (feels {now.feels.toFixed(0)}°)</span>}
          {now.wind !== null && <span>, wind {now.windDir} {now.wind} km/h{now.gust !== null && now.gust > now.wind ? `, gusts ${now.gust}` : ''}</span>}
          {now.rain !== null && now.rain > 0 && <span>, {now.rain} mm rain since 9 am</span>}
          <span className="block text-xs text-muted">{now.station} station{now.at && `, ${clock(now.at)}`}</span>
        </p>
      )}
      {today && (
        <div className="mt-2 flex gap-2 text-sm">
          <TodayIcon descriptor={today.icon} />
          <p>
            <strong>Today:</strong> {today.text || today.short}
            {today.rainChance !== null && <span className="text-muted"> Rain chance {today.rainChance}%.</span>}
          </p>
        </div>
      )}
      {weather && weather.days.length > 1 && (
        <ol className="mt-3 grid grid-cols-7 gap-1 text-center text-xs" aria-label="The week ahead">
          {weather.days.slice(1, 8).map((d) => (
            <DayCell key={d.date} day={d} />
          ))}
        </ol>
      )}
    </div>
  )
}

function TodayIcon({ descriptor }: { descriptor: string }) {
  const kind = iconKind(descriptor)
  return kind ? <WeatherIcon kind={kind} className="mt-0.5 size-9 shrink-0" /> : null
}

function DayCell({ day }: { day: Day }) {
  const kind = iconKind(day.icon)
  return (
    <li className="min-w-0 rounded bg-paper px-0.5 py-1" title={`${day.short} ${day.text}`}>
      <div className="font-semibold">{weekday(day.date)}</div>
      {kind && <WeatherIcon kind={kind} className="mx-auto my-0.5 size-6" />}
      <div>{deg(day.max)}</div>
      <div className="text-muted">{deg(day.min)}</div>
      <div className={day.rainChance !== null && day.rainChance >= 50 ? 'font-semibold text-link' : 'text-muted'}>{day.rainChance === null ? '' : `${day.rainChance}%`}</div>
    </li>
  )
}
