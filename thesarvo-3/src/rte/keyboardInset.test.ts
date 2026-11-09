import { expect, it } from 'vitest'
import { keyboardInset } from './keyboardInset'

it('is the height the keyboard covers, never negative', () => {
  expect(keyboardInset(800, { height: 800, offsetTop: 0 })).toBe(0)
  expect(keyboardInset(800, { height: 480, offsetTop: 0 })).toBe(320)
  expect(keyboardInset(800, { height: 480, offsetTop: 100 })).toBe(220)
  expect(keyboardInset(800, { height: 820, offsetTop: 0 })).toBe(0)
})
