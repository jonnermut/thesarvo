import { beforeEach, describe, expect, it } from 'vitest'
import type { Guide } from './model/types'
import { expired, includesSave, rememberSaved } from './justSaved'

const guide: Guide = { id: '7', guideStars: '', nodes: [] }

describe('includesSave', () => {
  it('is true once the build holds a commit made at or after the save', () => {
    expect(includesSave('2026-10-28T10:00:20Z', '2026-10-28T10:00:10Z')).toBe(true)
    expect(includesSave('2026-10-28T10:00:10Z', '2026-10-28T10:00:10Z')).toBe(true)
  })
  it('is false while the build is older than the save', () => {
    expect(includesSave('2026-10-28T10:00:05Z', '2026-10-28T10:00:10Z')).toBe(false)
  })
  it('takes a build without a time as including it', () => {
    expect(includesSave(undefined, '2026-10-28T10:00:10Z')).toBe(true)
  })
})

describe('expired', () => {
  it('stops showing a save the build never picked up', () => {
    const saved = { guide, at: '2026-10-28T10:00:00Z' }
    expect(expired(saved, Date.parse('2026-10-28T10:05:00Z'))).toBe(false)
    expect(expired(saved, Date.parse('2026-10-28T10:11:00Z'))).toBe(true)
  })
})

describe('rememberSaved', () => {
  beforeEach(() => localStorage.clear())
  it('keeps the last save of each guide', () => {
    rememberSaved(guide, '2026-10-28T10:00:00Z')
    rememberSaved({ ...guide, id: '8' }, '2026-10-28T10:00:01Z')
    const all = JSON.parse(localStorage.getItem('thesarvo.justSaved') ?? '{}') as Record<string, { at: string }>
    expect(Object.keys(all).sort()).toEqual(['7', '8'])
  })
})
