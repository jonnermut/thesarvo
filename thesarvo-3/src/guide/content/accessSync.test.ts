import { describe, expect, it } from 'vitest'
import { accessFromRestrictions } from './accessSync'

describe('accessFromRestrictions', () => {
  const known = new Set(['1', '2', '3', '4'])
  it('maps groups, makes named-user-only pages admin-only drafts, and reports what it cannot place', () => {
    const r = accessFromRestrictions(
      [
        { id: '1', group: 'CCTMembers' }, { id: '1', group: null }, { id: '1', group: 'CCTMembers' },
        { id: '2', group: null },
        { id: '3', group: 'confluence-administrators' }, { id: '3', group: 'Strangers' },
        { id: '99', group: 'CCTMembers' },
      ],
      known,
    )
    expect(r.access).toEqual({ '1': { groups: ['cct-members'] }, '2': { draft: true }, '3': { groups: ['admins'] } })
    expect(r.unmapped).toEqual(['Strangers'])
    expect(r.missing).toEqual(['99'])
  })
  it('keeps a group-restricted page private even when its group is unknown', () => {
    expect(accessFromRestrictions([{ id: '4', group: 'Strangers' }], known).access).toEqual({ '4': { draft: true } })
  })
})
