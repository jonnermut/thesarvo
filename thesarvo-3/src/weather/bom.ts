import { geohash } from './geohash'
import type { Place } from './places'

const API = 'https://api.weather.bom.gov.au/v1/locations'

export type Day = { date: string; icon: string; min: number | null; max: number | null; short: string; text: string; rainChance: number | null; rainMax: number | null; fire: string }
export type Observation = { temp: number | null; feels: number | null; wind: number | null; windDir: string; gust: number | null; rain: number | null; station: string; stationId: string; at: string }
export type Weather = { days: Day[]; now: Observation | null }

type Json = Record<string, unknown>
const obj = (v: unknown): Json => (typeof v === 'object' && v !== null ? (v as Json) : {})
const num = (v: unknown) => (typeof v === 'number' ? v : null)
const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** The Bureau's daily forecast, one entry per day (about a week). */
export function parseDays(body: unknown): Day[] {
  const data = obj(body).data
  if (!Array.isArray(data)) return []
  return data.map((d): Day => {
    const day = obj(d)
    const rain = obj(day.rain)
    return {
      date: str(day.date),
      icon: str(day.icon_descriptor),
      min: num(day.temp_min),
      max: num(day.temp_max),
      short: str(day.short_text),
      text: str(day.extended_text),
      rainChance: num(rain.chance),
      rainMax: num(obj(rain.amount).max) ?? num(obj(rain.amount).min),
      fire: str(day.fire_danger),
    }
  }).filter((d) => d.date)
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
    station: str(obj(d.station).name),
    stationId: str(obj(d.station).bom_id),
    at: str(obj(root.metadata).observation_time),
  }
}

async function get(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

/** Straight from the Bureau's own API in the browser (it allows that), so nothing passes through our servers. */
export async function fetchWeather(p: Place): Promise<Weather> {
  const [days, now] = await Promise.all([
    get(`${API}/${geohash(p.lat, p.lng, 7)}/forecasts/daily`),
    get(`${API}/${geohash(p.lat, p.lng, 6)}/observations`).catch(() => null),
  ])
  return { days: parseDays(days), now: parseObservation(now) }
}
