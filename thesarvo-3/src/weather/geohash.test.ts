import { expect, it } from 'vitest'
import { geohash } from './geohash'

it('encodes the standard example', () => {
  expect(geohash(57.64911, 10.40744, 11)).toBe('u4pruydqqvj')
})

it('puts Hobart where the Bureau does', () => {
  expect(geohash(-42.8826, 147.3257, 5)).toBe('r22u0')
})
