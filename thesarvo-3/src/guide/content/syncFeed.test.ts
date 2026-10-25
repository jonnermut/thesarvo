import { describe, expect, it } from 'vitest'
import { formatJson, guideEntries, guideIdOf, guideToStoredJson, parseFeed, storedIndex } from './syncFeed'

const FEED = `<?xml version="1.0"?><updates indexHash="abc" maxLastMod="42">
<update url="http://www.thesarvo.com/confluence/plugins/servlet/guide/xml/96" lastModified="10" filename="96.xml"/>
<update url="http://www.thesarvo.com/confluence/plugins/servlet/guide/image/100/A.png?width=1000" lastModified="11" filename="100-a.png"/>
</updates>`

describe('sync feed', () => {
  it('reads the feed and picks out guides', () => {
    const feed = parseFeed(FEED)
    expect(feed).toMatchObject({ maxLastMod: 42, indexHash: 'abc' })
    expect(feed.entries[0].url).toMatch(/^https:\/\//)
    const guides = guideEntries(feed)
    expect(guides.map(guideIdOf)).toEqual(['96'])
  })

  it('copes with a feed of one update or none', () => {
    expect(parseFeed('<updates maxLastMod="1" indexHash="x"><update url="u" filename="1.xml" lastModified="2"/></updates>').entries).toHaveLength(1)
    expect(parseFeed('<updates maxLastMod="1" indexHash="x"></updates>').entries).toEqual([])
  })

  it('keeps ids and titles in the index and drops urls', () => {
    expect(storedIndex({ id: 1, title: 'A', url: 'x', children: [{ id: 2, title: 'B', url: 'y' }] })).toEqual({
      id: '1',
      title: 'A',
      children: [{ id: '2', title: 'B', children: [] }],
    })
  })

  it('formats guides identically every time', () => {
    const json = guideToStoredJson('5', '<guide guidestars="*"><text id="1" class="heading1">Hi</text></guide>')
    expect(json.endsWith('\n')).toBe(true)
    expect(guideToStoredJson('5', '<guide guidestars="*"><text id="1" class="heading1">Hi</text></guide>')).toBe(json)
    expect(formatJson(JSON.parse(json))).toBe(json)
  })
})
