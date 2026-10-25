import { beforeEach, describe, expect, it } from 'vitest'
import type { Guide } from '#/guide/model/types'
import { fingerprint, localStore } from './drafts'

const guide: Guide = { id: '7', guideStars: '', nodes: [], other: {} }

beforeEach(() => localStorage.clear())

describe('localStore', () => {
  it('round-trips a draft and clears it', () => {
    expect(localStore.loadDraft('7')).toBeNull()
    localStore.saveDraft('7', guide, 'abc')
    expect(localStore.loadDraft('7')).toMatchObject({ guide, base: 'abc' })
    localStore.clearDraft('7')
    expect(localStore.loadDraft('7')).toBeNull()
  })

  it('ignores corrupt stored data', () => {
    localStorage.setItem('thesarvo.draft.7', '{not json')
    expect(localStore.loadDraft('7')).toBeNull()
  })
})

describe('fingerprint', () => {
  it('changes when content changes', () => {
    expect(fingerprint(guide)).toBe(fingerprint({ ...guide }))
    expect(fingerprint(guide)).not.toBe(fingerprint({ ...guide, guideStars: '*' }))
  })
})
