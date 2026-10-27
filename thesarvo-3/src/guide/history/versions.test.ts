import { describe, expect, it } from 'vitest'
import type { Guide, GuideNode, TextBlock } from '#/guide/model/types'
import { diffGuides, mergeChanges } from '#/guide/save/changes'
import { updateHistory } from '#/guide/save/history'
import type { HistoryEntry } from '#/guide/save/history'
import { undoChanges, versionAfter } from './versions'

const text = (id: string, t = ''): TextBlock => ({ type: 'text', id, cls: 'text', text: t })
const guide = (...nodes: GuideNode[]): Guide => ({ id: '1', guideStars: '', nodes })
const jon = { sub: 's1', name: 'Jon' }

/** Three sessions, the history the saves would write and each version. */
function sessions() {
  const v0 = guide(text('1', 'a'), text('2', 'b'))
  const v1 = guide(text('1', 'a2'), text('2', 'b'))
  const v2 = { ...guide(text('2', 'b'), text('1', 'a2'), text('3', 'c')), guideStars: '**' }
  const v3 = guide(text('2', 'b3'), text('3', 'c'))
  let history: HistoryEntry[] = []
  for (const [i, [from, to]] of [[v0, v1], [v1, v2], [v2, v3]].entries())
    history = updateHistory(history, { session: `s${i + 1}`, user: jon, at: `2026-10-0${i + 1}T00:00:00Z`, changes: diffGuides(from, to), guide: to })
  return { v0, v1, v2, v3, history }
}

describe('versionAfter', () => {
  it('works back from the guide now to how each session left it', () => {
    const { v1, v2, v3, history } = sessions()
    expect(versionAfter(v3, history, 's3')).toEqual(v3)
    expect(versionAfter(v3, history, 's2')).toEqual(v2)
    expect(versionAfter(v3, history, 's1')).toEqual(v1)
    expect(versionAfter(v3, history, 'nope')).toBeNull()
  })
})

describe('undoChanges', () => {
  it('undoes a session', () => {
    const { v1, v2, history } = sessions()
    expect(mergeChanges(v2, undoChanges(history[1])).guide).toEqual(v1)
  })
  it('conflicts where a later session changed the same block', () => {
    const { v3, history } = sessions()
    expect(mergeChanges(v3, undoChanges(history[0])).conflicts).toEqual([{ id: '1', theirs: null, mine: text('1', 'a') }])
  })
})
