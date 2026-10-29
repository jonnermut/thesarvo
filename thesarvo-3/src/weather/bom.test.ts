import { expect, it } from 'vitest'
import { parseDays, parseObservation } from './bom'

it('reads the daily forecast and ignores what is missing', () => {
  const days = parseDays({
    data: [
      { date: '2026-10-28T13:00:00Z', temp_max: 20, temp_min: 10, short_text: 'Mostly sunny.', extended_text: 'Winds westerly 25 to 35 km/h.', rain: { chance: 20, amount: { min: 0, max: null } }, fire_danger: 'High' },
      { date: '2026-10-29T13:00:00Z', temp_max: null, short_text: null },
      { temp_max: 5 },
    ],
  })
  expect(days).toHaveLength(2)
  expect(days[0]).toEqual({ date: '2026-10-28T13:00:00Z', min: 10, max: 20, short: 'Mostly sunny.', text: 'Winds westerly 25 to 35 km/h.', rainChance: 20, rainMax: 0, fire: 'High' })
  expect(days[1]).toMatchObject({ max: null, min: null, short: '', rainChance: null })
})

it('reads an observation, and nothing from an error', () => {
  const now = parseObservation({ metadata: { observation_time: '2026-10-29T02:30:00Z' }, data: { temp: 19.4, wind: { speed_kilometre: 35, direction: 'NW' }, gust: { speed_kilometre: 52 }, rain_since_9am: 0, station: { name: 'Hobart' } } })
  expect(now).toMatchObject({ temp: 19.4, wind: 35, windDir: 'NW', gust: 52, rain: 0, station: 'Hobart', at: '2026-10-29T02:30:00Z' })
  expect(parseObservation({ errors: [{ code: 'WEATHER-400' }] })).toBeNull()
  expect(parseDays('nonsense')).toEqual([])
})
