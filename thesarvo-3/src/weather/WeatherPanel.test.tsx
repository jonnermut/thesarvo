import { cleanup, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { RainLine, swellTone } from './WeatherPanel'

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
  expect([1.9, 2, 3, 4.2].map(swellTone)).toEqual(['', 'text-amber-deep', 'text-red-700', 'bg-red-50 text-red-900'])
})
