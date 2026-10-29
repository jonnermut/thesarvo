import { expect, it } from 'vitest'
import { iconKind } from './icons'

it('turns the Bureau\'s icon names into pictures', () => {
  expect(iconKind('sunny')).toBe('sun')
  expect(iconKind('clear')).toBe('sun')
  expect(iconKind('mostly_sunny')).toBe('partly')
  expect(iconKind('partly_cloudy')).toBe('partly')
  expect(iconKind('cloudy')).toBe('cloud')
  expect(iconKind('light_shower')).toBe('shower')
  expect(iconKind('heavy_shower')).toBe('shower')
  expect(iconKind('light_rain')).toBe('drizzle')
  expect(iconKind('rain')).toBe('rain')
  expect(iconKind('storm')).toBe('storm')
  expect(iconKind('windy')).toBe('wind')
  expect(iconKind('snow')).toBe('snow')
  expect(iconKind('fog')).toBe('fog')
  expect(iconKind('')).toBeUndefined()
  expect(iconKind('something_new')).toBeUndefined()
})
