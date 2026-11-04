import { expect, it } from 'vitest'
import { applyTheme, parseTheme, THEME_KEY, THEME_SCRIPT } from './theme'

it('takes only light and dark as a choice', () => {
  expect([parseTheme('dark'), parseTheme('light'), parseTheme('auto'), parseTheme(null)]).toEqual(['dark', 'light', 'system', 'system'])
})

it('sets and clears data-theme', () => {
  applyTheme('dark')
  expect(document.documentElement.dataset.theme).toBe('dark')
  applyTheme('system')
  expect(document.documentElement.dataset.theme).toBeUndefined()
})

it('has a head script that applies the saved choice and ignores anything else', () => {
  localStorage.setItem(THEME_KEY, 'dark')
  new Function(THEME_SCRIPT)()
  expect(document.documentElement.dataset.theme).toBe('dark')
  applyTheme('system')
  localStorage.setItem(THEME_KEY, 'neon')
  new Function(THEME_SCRIPT)()
  expect(document.documentElement.dataset.theme).toBeUndefined()
  localStorage.clear()
})
