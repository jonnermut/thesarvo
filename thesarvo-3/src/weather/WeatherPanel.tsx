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
        Forecasts and observations © Commonwealth of Australia, Bureau of Meteorology, loaded in your browser from <a className="underline hover:text-navy" href="https://www.bom.gov.au/tas/">bom.gov.au</a>; yesterday's rain and the swell from <a className="underline hover:text-navy" href="https://open-meteo.com/">Open-Meteo</a>. Times are Tasmanian time.
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
  // The Bureau's last day is often only a minimum temperature: nothing to read, so it is left out.
  const week = (weather?.days.slice(1, 8) ?? []).filter((d) => d.max !== null || d.icon || d.rainChance !== null)
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
        <div className="mt-3">
          <dl className="grid grid-cols-4 gap-1.5 text-center">
            <Stat label="Now" value={now.temp !== null ? `${now.temp.toFixed(0)}°` : '–'} sub={now.feels !== null && now.temp !== null && Math.abs(now.feels - now.temp) >= 3 ? `feels ${now.feels.toFixed(0)}°` : ''} subTone={now.feels !== null && now.temp !== null ? tone(now.temp - now.feels, 6, 10) : ''} />
            <Stat label={`Wind ${now.windDir}`.trim()} value={now.wind !== null ? `${now.wind}` : '–'} sub={now.gust !== null && now.wind !== null && now.gust > now.wind ? `gusts ${now.gust}` : 'km/h'} subTone={tone(now.gust, 40, 60)} />
            <Stat label="Humidity" value={now.humidity !== null ? `${Math.round(now.humidity)}%` : '–'} sub="" />
            {now.deltaT !== null ? (
              <Stat label="Delta-T" value={now.deltaT.toFixed(1)} sub={dryingWord(now.deltaT)} subTone={dryingTone(now.deltaT)} onClick={() => setExplain((e) => !e)} expanded={explain} />
            ) : (
              <Stat label="Delta-T" value="–" sub="" />
            )}
            {weather?.swell && (
              <div className={`col-span-4 flex items-baseline justify-center gap-2 rounded px-1 py-1 ${swellTone(weather.swell.height) || 'bg-paper'}`} title="Swell now, modelled by Open-Meteo for the open sea off this coast">
                <dt className="text-[11px]">Swell</dt>
                <dd className="m-0 text-[17px] font-bold leading-snug">{weather.swell.height.toFixed(1)} m</dd>
                <dd className="m-0 text-[11px]">{[weather.swell.dir, weather.swell.period !== null && `${Math.round(weather.swell.period)} s`].filter(Boolean).join(' · ')}</dd>
              </div>
            )}
          </dl>
          {explain && <p className="mt-1 text-xs text-muted">Delta-T is the air temperature minus the wet-bulb temperature, and it tells you how fast moisture will leave the rock. Near zero the air is saturated and cold rock sweats, so sea cliffs and overhangs stay wet. Locals read above 3 as drying and 4 or more as good conditions. The overnight trend matters too: if it sat near zero all night and is still under 1 in the morning, expect wet rock; if it is climbing through the 2s, the rock is drying. Based on climbers' experience at The Paradiso, not a scientific rule.</p>}
          <RainLine today={now.rain} yesterday={weather?.rainYesterday ?? null} forecast={today?.rainMax ?? null} />
          <p className="mt-1 text-xs text-muted">{now.station} station{now.at && `, ${clock(now.at)}`}</p>
        </div>
      )}
      {today && (
        <div className="mt-2 flex gap-2 text-sm">
          <TodayIcon descriptor={today.icon} />
          <div>
            <p className="font-semibold">
              Today {deg(today.min)}–{deg(today.max)}
              {today.rainChance !== null && <span className={`ml-2 ${chanceTone(today.rainChance, today.rainMax) || 'font-normal text-muted'}`}>{today.rainChance}% rain</span>}
            </p>
            <p>{today.text || today.short}</p>
            {today.humMin !== null && today.humMax !== null && <p className="text-xs text-muted">Humidity {Math.round(today.humMin)}–{Math.round(today.humMax)}%{today.deltaMax !== null && <>, <span className={dryingTone(today.deltaMax)}>Delta-T up to {today.deltaMax.toFixed(1)}</span></>}</p>}
          </div>
        </div>
      )}
      <div className="mt-auto">
        {week.length > 0 && (
          <ol className="mt-3 grid gap-1 text-center text-xs" style={{ gridTemplateColumns: `repeat(${week.length}, minmax(0, 1fr))` }} aria-label="The week ahead">
            {week.map((d) => (
              <DayCell key={d.date} day={d} />
            ))}
          </ol>
        )}
        {footer && <div className="pt-2">{footer}</div>}
      </div>
    </div>
  )
}

const RAIN_TIMEFRAMES = "Since 9 am: the station's rain gauge from 9 am today (the Bureau's rain day starts at 9 am, so early in the morning this is still last night's rain). Yesterday: the whole of yesterday, midnight to midnight, as modelled by Open-Meteo, not a gauge reading. Forecast: the Bureau's expected total for today."

/** Rain already fallen, since recent rain is what decides whether rock is wet: the station's gauge since 9 am today, yesterday's total and what is forecast for today, as three figures in a row. Hover for what each timeframe means. */
export function RainLine({ today, yesterday, forecast = null }: { today: number | null; yesterday: number | null; forecast?: number | null }) {
  const mm = (n: number) => (n < 0.1 ? 'none' : `${n.toFixed(n < 10 ? 1 : 0)} mm`)
  const items = [
    today !== null && { label: 'Since 9 am', text: mm(today), level: tone(today, 1, 10) },
    yesterday !== null && { label: 'Yesterday', text: mm(yesterday), level: tone(yesterday, 1, 10) },
    forecast !== null && forecast > 0 && { label: 'Forecast today', text: `≤ ${mm(forecast)}`, level: tone(forecast, 1, 10) },
  ].filter((x) => x !== false)
  if (!items.length) return <p className="mt-2 text-[13px] text-muted">Rain: no reading</p>
  return (
    <div className="mt-2 text-[13px]" title={RAIN_TIMEFRAMES}>
      <strong>Rain<span aria-hidden className="ml-1 cursor-help font-normal text-muted">ⓘ</span></strong>
      <div className="mt-0.5 grid grid-cols-3 gap-1.5 text-center">
        {items.map((i) => (
          <span key={i.label} className="rounded bg-paper px-1 py-1">
            <span className="block text-[11px] leading-tight text-muted">{i.label}</span>
            <span className={`whitespace-nowrap font-semibold ${i.level}`}>{i.text}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/** One warning scale for everything on the card, kept calm: nothing, amber (take care), bold amber (serious), and a red tile only for the worst. `cuts` are the values where each step starts. */
const TONES = ['', 'text-amber-deep', 'font-bold text-amber-deep', 'bg-red-50 text-red-900']
export const tone = (v: number | null, ...cuts: number[]) => (v === null ? '' : TONES[cuts.filter((c) => v >= c).length])

/** A rain chance only matters with rain behind it: it takes the milder of its own tone and the tone of the amount forecast (a certain 0-1 mm is nothing; no amount known counts as amber at most). */
export const chanceTone = (chance: number | null, mm: number | null) => {
  const own = TONES.indexOf(tone(chance, 50, 80))
  const amount = mm === null ? 1 : TONES.indexOf(tone(mm, 1, 10)) || 0
  return TONES[Math.min(own, amount)]
}

/** A sea cliff swell that matters: amber from 2 m, red from 3 m, a red tile from 4 m. */
export const swellTone = (m: number) => tone(m, 2, 3, 4)
/** Delta-T is a warning when low: under 1 the rock stays wet, under 3 it dries slowly. */
export const dryingTone = (d: number) => (d < 1 ? TONES[2] : d < 3 ? TONES[1] : '')

/** One figure in the strip of current conditions: a small label, the value large, and a line of detail. */
function Stat({ label, value, sub, subTone = '', onClick, expanded }: { label: string; value: string; sub: string; subTone?: string; onClick?: () => void; expanded?: boolean }) {
  const body = (
    <>
      <dt className="text-[11px] leading-tight text-muted">{label}</dt>
      <dd className="m-0 text-[17px] font-semibold leading-snug">{value}</dd>
      <dd className={`m-0 min-h-4 text-[11px] leading-tight ${subTone || 'text-muted'}`}>{sub}</dd>
    </>
  )
  return onClick ? (
    <div className="rounded bg-paper"><button type="button" aria-expanded={expanded} title="What is Delta-T?" onClick={onClick} className="block w-full px-1 py-1 hover:text-navy">{body}</button></div>
  ) : (
    <div className="rounded bg-paper px-1 py-1">{body}</div>
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
      <div className={chanceTone(day.rainChance, day.rainMax) ? `font-semibold ${chanceTone(day.rainChance, day.rainMax)}` : 'text-muted'}>{day.rainChance === null ? '' : `${day.rainChance}%`}</div>
    </li>
  )
}
