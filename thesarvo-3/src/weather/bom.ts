import { geohash } from './geohash'
import type { Place } from './places'

const API = 'https://api.weather.bom.gov.au/v1/locations'

export type Day = { date: string; icon: string; min: number | null; max: number | null; short: string; text: string; rainChance: number | null; rainMax: number | null; fire: string; humMin: number | null; humMax: number | null; deltaMax: number | null }
export type Observation = { temp: number | null; feels: number | null; wind: number | null; windDir: string; gust: number | null; rain: number | null; humidity: number | null; deltaT: number | null; station: string; stationId: string; at: string }
export type Swell = { height: number; period: number | null; dir: string }
export type Weather = { days: Day[]; now: Observation | null; rainYesterday: number | null; swell: Swell | null }

type Json = Record<string, unknown>
const obj = (v: unknown): Json => (typeof v === 'object' && v !== null ? (v as Json) : {})
const num = (v: unknown) => (typeof v === 'number' ? v : null)
const str = (v: unknown) => (typeof v === 'string' ? v : '')

/**
 * Delta-T: air temperature minus wet-bulb temperature (°C), the usual measure of how fast things dry (and how well spray droplets survive).
 * Under about 8 it is humid and slow to dry, 2 to 8 is the comfortable range for spraying, over 10 is very dry. The wet bulb is Stull's (2011)
 * fit from temperature and relative humidity, good to about 0.3° at sea level.
 */
export function deltaT(temp: number | null, humidity: number | null): number | null {
  if (temp === null || humidity === null || humidity < 1 || humidity > 100) return null
  const wet = temp * Math.atan(0.151977 * Math.sqrt(humidity + 8.313659)) + Math.atan(temp + humidity) - Math.atan(humidity - 1.676331) + 0.00391838 * humidity ** 1.5 * Math.atan(0.023101 * humidity) - 4.686035
  return Math.max(0, Math.round((temp - wet) * 10) / 10)
}

/** The Bureau gives the last day of the week no icon or text, only temperatures and a rain chance; the chance is all there is to draw from. */
const iconFromRain = (chance: number | null) => (chance === null ? '' : chance >= 50 ? 'shower' : chance >= 25 ? 'partly_cloudy' : 'mostly_sunny')

/** The Bureau's daily forecast, one entry per day (about a week). */
export function parseDays(body: unknown): Day[] {
  const data = obj(body).data
  if (!Array.isArray(data)) return []
  return data.map((d): Day => {
    const day = obj(d)
    const rain = obj(day.rain)
    return {
      date: str(day.date),
      icon: str(day.icon_descriptor) || iconFromRain(num(rain.chance)),
      min: num(day.temp_min),
      max: num(day.temp_max),
      short: str(day.short_text),
      text: str(day.extended_text),
      rainChance: num(rain.chance),
      rainMax: num(obj(rain.amount).max) ?? num(obj(rain.amount).min),
      fire: str(day.fire_danger),
      humMin: null,
      humMax: null,
      deltaMax: null,
    }
  }).filter((d) => d.date)
}

const TZ = 'Australia/Hobart'
const localDay = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ })

/** The Bureau's hourly forecast (about three days) folded into each day's humidity range and its highest delta-T, keyed by Tasmanian date. */
export function parseHourly(body: unknown): Map<string, { humMin: number; humMax: number; deltaMax: number | null }> {
  const data = obj(body).data
  const days = new Map<string, { humMin: number; humMax: number; deltaMax: number | null }>()
  if (!Array.isArray(data)) return days
  for (const h of data) {
    const hour = obj(h)
    const time = str(hour.time)
    const hum = num(hour.relative_humidity)
    if (!time || hum === null) continue
    const key = localDay(time)
    const dt = deltaT(num(hour.temp), hum)
    const d = days.get(key)
    days.set(key, { humMin: Math.min(d?.humMin ?? hum, hum), humMax: Math.max(d?.humMax ?? hum, hum), deltaMax: dt === null ? (d?.deltaMax ?? null) : Math.max(d?.deltaMax ?? dt, dt) })
  }
  return days
}

export function parseObservation(body: unknown): Observation | null {
  const root = obj(body)
  const d = obj(root.data)
  if (!Object.keys(d).length) return null
  return {
    temp: num(d.temp),
    feels: num(d.temp_feels_like),
    wind: num(obj(d.wind).speed_kilometre),
    windDir: str(obj(d.wind).direction),
    gust: num(obj(d.gust).speed_kilometre),
    rain: num(d.rain_since_9am),
    humidity: num(d.humidity),
    deltaT: deltaT(num(d.temp), num(d.humidity)),
    station: str(obj(d.station).name),
    stationId: str(obj(d.station).bom_id),
    at: str(obj(root.metadata).observation_time),
  }
}

/**
 * Yesterday's rain in mm at the place, from Open-Meteo's daily total (the Bureau's API only has rain since 9 am today); null when it has no figure.
 * It is a model of the finished day (rounded to a tenth), not a gauge reading, so the page says so.
 */
export function parseYesterdayRain(body: unknown): number | null {
  const daily = obj(obj(body).daily)
  const rain = daily.precipitation_sum
  return Array.isArray(rain) ? num(rain[0]) : null
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']

/** The swell now, from Open-Meteo's marine model: height in metres, period in seconds and the compass point it comes from; null without a height. */
export function parseSwell(body: unknown): Swell | null {
  const cur = obj(obj(body).current)
  const height = num(cur.swell_wave_height) ?? num(cur.wave_height)
  if (height === null) return null
  const deg = num(cur.swell_wave_direction) ?? num(cur.wave_direction)
  return { height, period: num(cur.swell_wave_period) ?? num(cur.wave_period), dir: deg === null ? '' : COMPASS[Math.round(deg / 22.5) % 16] }
}

async function get(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

/** Straight from the Bureau's own API in the browser (it allows that), so nothing passes through our servers. */
export async function fetchWeather(p: Place): Promise<Weather> {
  const [days, now, hourly, past, sea] = await Promise.all([
    get(`${API}/${geohash(p.lat, p.lng, 7)}/forecasts/daily`),
    get(`${API}/${geohash(p.lat, p.lng, 6)}/observations`).catch(() => null),
    get(`${API}/${geohash(p.lat, p.lng, 6)}/forecasts/hourly`).catch(() => null),
    get(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&daily=precipitation_sum&past_days=1&forecast_days=1&timezone=${encodeURIComponent(TZ)}`).catch(() => null),
    p.sea ? get(`https://marine-api.open-meteo.com/v1/marine?latitude=${p.sea.lat}&longitude=${p.sea.lng}&current=wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction&timezone=${encodeURIComponent(TZ)}`).catch(() => null) : null,
  ])
  const byDay = parseHourly(hourly)
  return { days: parseDays(days).map((d) => ({ ...d, ...byDay.get(localDay(d.date)) })), now: parseObservation(now), rainYesterday: parseYesterdayRain(past), swell: parseSwell(sea) }
}
