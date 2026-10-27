import { describe, expect, it } from 'vitest'
import type { Climb, Header, ImageTopo } from '#/guide/model/types'
import { fieldDiffs, readable, wordDiff } from './diff'

const climb = (more: Partial<Climb> = {}): Climb => ({
  type: 'climb', id: '1', name: 'Albatros', number: '1', grade: '20', extra: '', length: '25m', stars: '', fa: '', text: '', ...more,
})
const header: Header = { type: 'header', id: 'h', name: 'Crag', rock: '', sun: '', walk: '', access: '', camping: '', acknowledgement: '', intro: '', history: '', autonumber: '' }

describe('wordDiff', () => {
  it('marks the words added and deleted, keeping the rest', () => {
    expect(wordDiff('Climb the steep crack to the top', 'Climb the thin crack to a ledge')).toEqual([
      { op: 'same', text: 'Climb the ' },
      { op: 'del', text: 'steep' },
      { op: 'add', text: 'thin' },
      { op: 'same', text: ' crack to ' },
      { op: 'del', text: 'the top' },
      { op: 'add', text: 'a ledge' },
    ])
  })
  it('handles one side empty, and no change', () => {
    expect(wordDiff('', 'New text')).toEqual([{ op: 'add', text: 'New text' }])
    expect(wordDiff('Old', '')).toEqual([{ op: 'del', text: 'Old' }])
    expect(wordDiff('Same', 'Same')).toEqual([{ op: 'same', text: 'Same' }])
  })
  it('gives up on the table for huge rewrites, still keeping the shared start and end', () => {
    const a = Array.from({ length: 2000 }, (_, i) => `a${i}`).join(' ')
    const b = Array.from({ length: 2000 }, (_, i) => `b${i}`).join(' ')
    expect(wordDiff(`Start ${a} end`, `Start ${b} end`)).toEqual([
      { op: 'same', text: 'Start ' },
      { op: 'del', text: a },
      { op: 'add', text: b },
      { op: 'same', text: ' end' },
    ])
  })
})

describe('readable', () => {
  it('keeps line breaks and drops tags', () => {
    expect(readable('One<br/>two &amp; <b>three</b>')).toBe('One\ntwo & three')
  })
})

describe('fieldDiffs', () => {
  it('lists the changed fields of a climb, prose as long', () => {
    expect(fieldDiffs(climb(), climb({ grade: '21', text: 'Steep<br/>wall' }))).toEqual([
      { field: 'Grade', before: '20', after: '21', long: false },
      { field: 'Description', before: '', after: 'Steep\nwall', long: true },
    ])
  })
  it('lists every filled field of a block added or deleted', () => {
    expect(fieldDiffs(null, climb()).map((f) => f.field)).toEqual(['Number', 'Name', 'Grade', 'Length'])
    expect(fieldDiffs(climb(), null).every((f) => f.after === '')).toBe(true)
  })
  it('names header fields as the history does', () => {
    expect(fieldDiffs(header, { ...header, intro: 'Sunny', autonumber: 'true' })).toEqual([
      { field: 'Intro', before: '', after: 'Sunny', long: true },
      { field: 'Numbering', before: '', after: 'on', long: true },
    ])
  })
  it('says a topo’s drawing changed without its data', () => {
    const topo: ImageTopo = {
      type: 'image', id: '9', src: 'a.jpg', width: 100, height: 50, noPrint: false, printLayout: '', legendTitle: '', legendFooter: '', legendX: 0, legendY: 0, legend: [], paths: [], rects: [], otherShapes: [],
    }
    expect(fieldDiffs(topo, { ...topo, legendX: 5 })).toEqual([{ field: 'Drawing', before: '', after: 'moved or restyled', long: false }])
  })
})
