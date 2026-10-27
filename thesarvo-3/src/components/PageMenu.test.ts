import { describe, expect, it } from 'vitest'
import { pageActions } from './PageMenu'

describe('pageActions', () => {
  it('offers the history, and the page itself from the editor or the history', () => {
    expect(pageActions({}).map((a) => a.label)).toEqual(['History'])
    expect(pageActions({ edit: true }).map((a) => a.mode)).toEqual([{}, { history: true }])
    expect(pageActions({ history: true }).map((a) => a.label)).toEqual(['View the page'])
  })
})
