import { cleanup, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { chanceTone, dryingTone, RainLine, swellTone, tone } from './WeatherPanel'

it('shows rain since 9 am, yesterday and the forecast as separate figures, and says so when there is no reading', () => {
  const { unmount } = render(<RainLine today={0} yesterday={2.94} />)
  expect(screen.getByText('Since 9 am').nextSibling?.textContent).toBe('none')
  expect(screen.getByText('Yesterday').nextSibling?.textContent).toBe('2.9 mm')
  unmount()
  render(<RainLine today={1.2} yesterday={0} forecast={6} />)
  expect(screen.getByText('Forecast today').nextSibling?.textContent).toBe('≤ 6.0 mm')
  cleanup()
  render(<RainLine today={null} yesterday={null} />)
  expect(screen.getByText('Rain: no reading')).toBeTruthy()
})

it('colours swell from 2 m, 3 m and 4 m', () => {
  expect([1.9, 2, 3, 4.2].map(swellTone)).toEqual(['', 'text-amber-deep', 'font-bold text-amber-deep', 'bg-red-50 text-red-900'])
})

it('uses one warning scale: none, amber, red, red tile', () => {
  expect([0.9, 1, 10].map((mm) => tone(mm, 1, 10))).toEqual(['', 'text-amber-deep', 'font-bold text-amber-deep'])
  expect([39, 40, 60].map((g) => tone(g, 40, 60))).toEqual(['', 'text-amber-deep', 'font-bold text-amber-deep'])
  expect(tone(null, 1)).toBe('')
  expect([0.5, 2, 5].map(dryingTone)).toEqual(['font-bold text-amber-deep', 'text-amber-deep', ''])
})

it('discounts a rain chance by the amount forecast', () => {
  expect(chanceTone(100, 0.5)).toBe('')
  expect(chanceTone(100, 4)).toBe('text-amber-deep')
  expect(chanceTone(90, 15)).toBe('font-bold text-amber-deep')
  expect(chanceTone(40, 15)).toBe('')
  expect(chanceTone(90, null)).toBe('text-amber-deep')
})
