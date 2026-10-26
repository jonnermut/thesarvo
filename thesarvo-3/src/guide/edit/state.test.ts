import { describe, expect, it } from 'vitest'
import type { Climb, Guide, ImageTopo, TextBlock } from '#/guide/model/types'
import { newTopo } from './newNodes'
import { climbKind, editorReducer, initEditor, nextId, nextNumber } from './state'

const text = (id: string, t = ''): TextBlock => ({ type: 'text', id, cls: 'text', text: t })
const climb = (id: string): Climb => ({
  type: 'climb', id, name: '', number: '', grade: '', extra: '', length: '', stars: '', fa: '', text: '',
})
const guide = (...nodes: Guide['nodes']): Guide => ({ id: '1', guideStars: '', nodes })
const ids = (g: Guide) => g.nodes.map((n) => (n.type === 'unknown' ? '' : n.id))

describe('editorReducer', () => {
  it('adds, moves and deletes nodes, with undo and redo', () => {
    let s = initEditor(guide(text('1'), text('2')))
    s = editorReducer(s, { type: 'add', node: text('3'), afterId: '1' })
    expect(ids(s.present)).toEqual(['1', '3', '2'])
    s = editorReducer(s, { type: 'move', id: '3', by: 1 })
    expect(ids(s.present)).toEqual(['1', '2', '3'])
    s = editorReducer(s, { type: 'delete', id: '1' })
    expect(ids(s.present)).toEqual(['2', '3'])

    s = editorReducer(s, { type: 'undo' })
    expect(ids(s.present)).toEqual(['1', '2', '3'])
    s = editorReducer(s, { type: 'redo' })
    expect(ids(s.present)).toEqual(['2', '3'])
  })

  it('ignores moves off the ends', () => {
    const s = initEditor(guide(text('1'), text('2')))
    expect(editorReducer(s, { type: 'move', id: '1', by: -1 })).toBe(s)
  })

  it('folds edits with the same key into one undo step', () => {
    let s = initEditor(guide(text('1')))
    for (const t of ['h', 'he', 'hel']) {
      s = editorReducer(s, { type: 'edit', id: '1', key: 'typing', update: (n) => ({ ...n, text: t }) as typeof n })
    }
    expect(s.past).toHaveLength(1)
    s = editorReducer(s, { type: 'undo' })
    expect((s.present.nodes[0] as TextBlock).text).toBe('')
  })

  it('clears redo history after a new edit', () => {
    let s = initEditor(guide(text('1')))
    s = editorReducer(s, { type: 'add', node: text('2') })
    s = editorReducer(s, { type: 'undo' })
    s = editorReducer(s, { type: 'add', node: text('3') })
    expect(s.future).toHaveLength(0)
  })
})

describe('autonumber', () => {
  const header = { type: 'header', id: 'h', autonumber: 'true' } as unknown as Guide['nodes'][number]

  it('renumbers climbs in order when the header asks for it', () => {
    let s = initEditor(guide(header, climb('a'), text('t'), climb('b')))
    s = editorReducer(s, { type: 'add', node: climb('c'), afterId: 'a' })
    const numbers = s.present.nodes.flatMap((n) => (n.type === 'climb' ? [n.number] : []))
    expect(numbers).toEqual(['1.', '2.', '3.'])
  })

  it('leaves numbers alone when the option is off', () => {
    const off = { ...header, autonumber: 'false' } as Guide['nodes'][number]
    const s = editorReducer(initEditor(guide(off, climb('a'))), { type: 'add', node: climb('b') })
    expect(s.present.nodes.flatMap((n) => (n.type === 'climb' ? [n.number] : []))).toEqual(['', ''])
  })
})

describe('nextId', () => {
  it('is one more than the largest id anywhere in the guide', () => {
    expect(nextId(guide(text('4'), climb('9')))).toBe('10')
    expect(nextId(guide())).toBe('1')
  })
})

describe('addClimbToTopo', () => {
  const topo: ImageTopo = { ...newTopo('t', 'a.jpg', 400, 300), paths: [{ id: 'p', points: [], d: '', linkedTo: '', lineStyle: 'solid', labelText: '', arrow: false }] }
  const numbered = (id: string, number: string) => ({ ...climb(id), number })

  it('adds after the topo’s last climb, numbered on, in the legend and on the route, as one undo step', () => {
    let s = initEditor(guide(topo, text('note'), numbered('a', '6.'), text('aside'), { ...text('h'), cls: 'heading2' }, numbered('b', '7.')))
    s = editorReducer(s, { type: 'addClimbToTopo', topoId: 't', climb: climb('new'), pathId: 'p' })
    expect(ids(s.present)).toEqual(['t', 'note', 'a', 'new', 'aside', 'h', 'b'])
    expect((s.present.nodes[3] as Climb).number).toBe('7.')
    const t = s.present.nodes[0] as ImageTopo
    expect(t.legend).toEqual(['new'])
    expect(t.paths[0].linkedTo).toBe('new')
    expect(s.past).toHaveLength(1)
  })
})

describe('nextNumber', () => {
  it('follows the guide’s style and gives up on odd numbers', () => {
    expect(nextNumber('6.')).toBe('7.')
    expect(nextNumber('11')).toBe('12')
    expect(nextNumber('4a')).toBe('')
  })
})

describe('climbKind', () => {
  it('is problems for a guide of mostly problems', () => {
    expect(climbKind(guide(climb('a'), { ...climb('b'), type: 'problem' }, { ...climb('c'), type: 'problem' }))).toBe('problem')
    expect(climbKind(guide(climb('a'), { ...climb('b'), type: 'problem' }))).toBe('climb')
  })
})
