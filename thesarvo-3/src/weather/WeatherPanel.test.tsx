import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { RainLine } from './WeatherPanel'

it('reads out rain since 9 am and yesterday, and says so when there is no reading', () => {
  const { unmount } = render(<RainLine today={0} yesterday={2.94} />)
  expect(screen.getByText(/Rain since 9 am none, yesterday 2\.9 mm/)).toBeTruthy()
  unmount()
  render(<RainLine today={null} yesterday={null} />)
  expect(screen.getByText('Rain: no reading')).toBeTruthy()
})
