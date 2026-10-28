import { describe, expect, it } from 'vitest'
import { parseMembers } from './members'

const emails = (text: string) => parseMembers(text).members.map((m) => m.email)

describe('parseMembers', () => {
  it('splits on any delimiter and lowercases', () => {
    expect(emails('A@x.com, b@x.com;c@x.com\td@x.com e@X.com\nf@x.com|g@x.com')).toEqual(['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com', 'e@x.com', 'f@x.com', 'g@x.com'])
  })

  it('reads Name <email> and mailto: forms, with names', () => {
    expect(parseMembers('Ann Climber <ann@x.com>, "Smith, Bob" <bob@x.com>, mailto:cy@x.com').members).toEqual([
      { email: 'ann@x.com', name: 'Ann Climber' },
      { email: 'bob@x.com', name: 'Smith, Bob' },
      { email: 'cy@x.com' },
    ])
  })

  it('takes names from a CSV export with quoted fields', () => {
    const csv = 'Date,"First name","Last name",Email,Address,Amount\n2026-01-01,Ann,Climber,ANN@x.com,"1 High St, Hobart",50\n2026-01-02,Bob,"O\'Hare",bob@x.com,"2 Low St",50\n'
    expect(parseMembers(csv).members).toEqual([
      { email: 'ann@x.com', name: 'Ann Climber' },
      { email: 'bob@x.com', name: "Bob O'Hare" },
    ])
  })

  it('counts duplicates and keeps the first name seen', () => {
    const r = parseMembers('a@x.com\nA@x.com\nName,Email\n')
    expect(r.members).toEqual([{ email: 'a@x.com' }])
    expect(r.duplicates).toBe(1)
  })

  it('reports addresses that look wrong, and ignores junk and empty text', () => {
    const r = parseMembers('good@x.com\nbad@nodot\nhello world\n')
    expect(r.members.map((m) => m.email)).toEqual(['good@x.com'])
    expect(r.skipped).toEqual(['bad@nodot'])
    expect(parseMembers('   \n\n')).toEqual({ members: [], duplicates: 0, skipped: [] })
  })

  it('strips trailing punctuation from prose', () => {
    expect(emails('Please add ann@x.com, and bob@x.com.')).toEqual(['ann@x.com', 'bob@x.com'])
  })
})
