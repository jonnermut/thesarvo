import { beforeEach, describe, expect, it } from 'vitest'
import type { Guide } from '#/guide/model/types'
import { localStore } from './drafts'

const guide: Guide = { id: '7', guideStars: '', nodes: [] }

beforeEach(() => localStorage.clear())

describe('localStore', () => {
  it('round-trips a draft and clears it', () => {
    expect(localStore.loadDraft('7')).toBeNull()
    const base = { ...guide, guideStars: '*' }
    localStore.saveDraft('7', guide, base)
    expect(localStore.loadDraft('7')).toMatchObject({ guide, base })
    localStore.clearDraft('7')
    expect(localStore.loadDraft('7')).toBeNull()
  })

  it('ignores corrupt stored data', () => {
    localStorage.setItem('thesarvo.draft.7', '{not json')
    expect(localStore.loadDraft('7')).toBeNull()
  })
})
