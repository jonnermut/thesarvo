import { expect, it } from 'vitest'
import { deltaT, parseDays, parseHourly, parseObservation } from './bom'

it('reads the daily forecast and ignores what is missing', () => {
  const days = parseDays({
    data: [
      { date: '2026-10-28T13:00:00Z', temp_max: 20, temp_min: 10, short_text: 'Mostly sunny.', icon_descriptor: 'mostly_sunny', extended_text: 'Winds westerly 25 to 35 km/h.', rain: { chance: 20, amount: { min: 0, max: null } }, fire_danger: 'High' },
      { date: '2026-10-29T13:00:00Z', temp_max: null, short_text: null },
      { temp_max: 5 },
    ],
  })
  expect(days).toHaveLength(2)
  expect(days[0]).toEqual({ date: '2026-10-28T13:00:00Z', icon: 'mostly_sunny', min: 10, max: 20, short: 'Mostly sunny.', text: 'Winds westerly 25 to 35 km/h.', rainChance: 20, rainMax: 0, fire: 'High', humMin: null, humMax: null, deltaMax: null })
  expect(days[1]).toMatchObject({ max: null, min: null, short: '', rainChance: null, humMin: null })
})

it('draws the last day, which has no icon from the Bureau, from its rain chance', () => {
  const icon = (chance: number | null) => parseDays({ data: [{ date: '2026-11-05T13:00:00Z', icon_descriptor: null, rain: { chance } }] })[0].icon
  expect([icon(60), icon(30), icon(10), icon(null)]).toEqual(['shower', 'partly_cloudy', 'mostly_sunny', ''])
})

it('reads an observation, and nothing from an error', () => {
  const now = parseObservation({ metadata: { observation_time: '2026-10-29T02:30:00Z' }, data: { temp: 19.4, wind: { speed_kilometre: 35, direction: 'NW' }, gust: { speed_kilometre: 52 }, rain_since_9am: 0, humidity: 50, station: { name: 'Hobart', bom_id: '094029' } } })
  expect(now).toMatchObject({ temp: 19.4, wind: 35, windDir: 'NW', gust: 52, rain: 0, humidity: 50, station: 'Hobart', stationId: '094029', at: '2026-10-29T02:30:00Z' })
  expect(parseObservation({ errors: [{ code: 'WEATHER-400' }] })).toBeNull()
  expect(parseDays('nonsense')).toEqual([])
})

it('works out delta-T from temperature and humidity', () => {
  expect(deltaT(20, 50)).toBeCloseTo(6.3, 0)
  expect(deltaT(30, 20)).toBeCloseTo(14.1, 0)
  expect(deltaT(10, 100)).toBeLessThan(0.5)
  expect(deltaT(null, 50)).toBeNull()
  expect(deltaT(20, null)).toBeNull()
  expect(deltaT(20, 0)).toBeNull()
  expect(parseObservation({ data: { temp: 20, humidity: 50 } })).toMatchObject({ humidity: 50, deltaT: deltaT(20, 50) })
})

it('folds the hourly forecast into a humidity range and the highest delta-T for each Tasmanian day', () => {
  const days = parseHourly({ data: [
    { time: '2026-10-29T14:00:00Z', temp: 12, relative_humidity: 80 },
    { time: '2026-10-30T01:00:00Z', temp: 22, relative_humidity: 35 },
    { time: '2026-10-30T04:00:00Z', temp: 18, relative_humidity: 60 },
    { time: '2026-10-30T05:00:00Z', temp: 18 },
  ] })
  expect([...days.keys()]).toEqual(['2026-10-30'])
  expect(days.get('2026-10-30')).toMatchObject({ humMin: 35, humMax: 80, deltaMax: deltaT(22, 35) })
  expect(parseHourly(null).size).toBe(0)
})
