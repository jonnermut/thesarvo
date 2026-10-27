import { describe, expect, it } from 'vitest'
import { newTopo } from '#/guide/edit/newNodes'
import { Invalid, parseSaveRequest } from './validate'

const climb = { type: 'climb', id: '2', name: 'A', number: '', grade: '', extra: '', length: '', stars: '', fa: '', text: '' }
const request = (nodes: unknown[], more = {}) => ({ guide: '167', session: 'abc-1', changes: { nodes }, ...more })

describe('parseSaveRequest', () => {
  it('rebuilds a request from known keys only', () => {
    const topo = { ...newTopo('3', 'a.jpg', 1, 2), paths: [{ id: '4', points: [{ x: 1, y: 2, kind: 'none' }], d: '', linkedTo: '2', lineStyle: 'solid', labelText: '', arrow: false }] }
    const parsed = parseSaveRequest(request([{ id: '2', before: null, after: { ...climb, extra: 'x', evil: 1 } }, { id: '3', before: topo, after: null }], { junk: true }), 'request')
    expect(parsed).toEqual(request([{ id: '2', before: null, after: { ...climb, extra: 'x' } }, { id: '3', before: topo, after: null }]))
  })

  it('refuses bad blocks, ids and types, saying where', () => {
    expect(() => parseSaveRequest(request([{ id: '2', before: null, after: { ...climb, grade: 7 } }]), 'request')).toThrow('request.changes.nodes[0].after.grade: expected a string')
    expect(() => parseSaveRequest(request([{ id: '9', before: null, after: climb }]), 'request')).toThrow(Invalid)
    expect(() => parseSaveRequest(request([{ id: '2', before: null, after: { type: 'script' } }]), 'request')).toThrow('a block type')
    expect(() => parseSaveRequest({ ...request([]), guide: '../x' }, 'request')).toThrow('request.guide')
    expect(() => parseSaveRequest(null, 'request')).toThrow(Invalid)
  })
})
