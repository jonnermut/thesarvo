import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchWeather } from './bom'
import type { Day, Weather } from './bom'
import { iconKind, WeatherIcon } from './icons'
import { bomForecastUrl, bomStationUrl, PLACES, swellUrl } from './places'
import type { Place } from './places'

const TZ = 'Australia/Hobart'
const weekday = (iso: string) => new Date(iso).toLocaleDateString('en-AU', { weekday: 'short', timeZone: TZ })
const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', timeZone: TZ })
export const deg = (n: number | null) => (n === null ? '–' : `${Math.round(n)}°`)

/** How quickly things dry at this Delta-T, in a word. */
export const dryingWord = (d: number) => (d < 1 ? 'likely damp' : d < 3 ? 'marginal' : d < 4 ? 'drying' : 'good drying')

type State = { weather: Weather } | { error: true } | undefined

/** Forecasts and the latest observations for where Tasmanian climbers go, straight from the Bureau of Meteorology in the browser. */
export function WeatherPanel() {
  return (
    <section aria-label="Weather where we climb" className="mt-4">
      <p className="text-sm text-muted">
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
export function loadWeather(p: Place) {
  let w = loaded.get(p.name)
  if (!w) {
    w = fetchWeather(p)
    loaded.set(p.name, w)
    w.catch(() => loaded.delete(p.name))
  }
  return w
}

/** `footer`, when given, sits along the bottom of the card. */
export function PlaceCard({ place, footer }: { place: Place; footer?: ReactNode }) {
  const [state, setState] = useState<State>()
  const [explain, setExplain] = useState(false)
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
    <div className="card flex h-full flex-col p-3">
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
          {now.humidity !== null && <span>, humidity {Math.round(now.humidity)}%</span>}
          {now.deltaT !== null && (
            <span>
              , <button type="button" aria-expanded={explain} onClick={() => setExplain((e) => !e)} className="underline decoration-dotted underline-offset-2 hover:text-navy">Delta-T {now.deltaT.toFixed(1)}</button> ({dryingWord(now.deltaT)})
            </span>
          )}
          {now.rain !== null && now.rain > 0 && <span>, {now.rain} mm rain since 9 am</span>}
          <span className="block text-xs text-muted">{now.station} station{now.at && `, ${clock(now.at)}`}</span>
          {explain && <span className="mt-1 block text-xs text-muted">Delta-T is the air temperature minus the wet-bulb temperature, and it tells you how fast moisture will leave the rock. Near zero the air is saturated and cold rock sweats, so sea cliffs and overhangs stay wet. Locals read above 3 as drying and 4 or more as good conditions. The overnight trend matters too: if it sat near zero all night and is still under 1 in the morning, expect wet rock; if it is climbing through the 2s, the rock is drying. Based on climbers' experience at The Paradiso, not a scientific rule.</span>}
        </p>
      )}
      {today && (
        <div className="mt-2 flex gap-2 text-sm">
          <TodayIcon descriptor={today.icon} />
          <p>
            <strong>Today:</strong> {today.text || today.short}
            {today.rainChance !== null && <span className="text-muted"> Rain chance {today.rainChance}%.</span>}
            {today.humMin !== null && today.humMax !== null && <span className="text-muted"> Humidity {Math.round(today.humMin)}–{Math.round(today.humMax)}%{today.deltaMax !== null && `, Delta-T up to ${today.deltaMax.toFixed(1)}`}.</span>}
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
      {footer && <div className="mt-auto pt-2">{footer}</div>}
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
    <li className="min-w-0 rounded bg-paper px-0.5 py-1" title={`${day.short} ${day.text}${day.humMin !== null && day.humMax !== null ? ` Humidity ${Math.round(day.humMin)}–${Math.round(day.humMax)}%${day.deltaMax !== null ? `, Delta-T up to ${day.deltaMax.toFixed(1)}` : ''}.` : ''}`}>
      <div className="font-semibold">{weekday(day.date)}</div>
      {kind && <WeatherIcon kind={kind} className="mx-auto my-0.5 size-6" />}
      <div>{deg(day.max)}</div>
      <div className="text-muted">{deg(day.min)}</div>
      <div className={day.rainChance !== null && day.rainChance >= 50 ? 'font-semibold text-link' : 'text-muted'}>{day.rainChance === null ? '' : `${day.rainChance}%`}</div>
    </li>
  )
}
