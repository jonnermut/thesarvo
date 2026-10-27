import type { Climb, Guide, GuideNode } from '#/guide/model/types'
import { topoSection } from '#/guide/view/section'

/** Editor state: the guide being edited plus undo/redo history. */
export type EditorState = {
  present: Guide
  past: Guide[]
  future: Guide[]
  /** Key of the last edit, so a burst of related edits (typing, dragging) is one undo step. */
  lastKey: string | null
}

export type Action =
  | { type: 'edit'; id: string; update: (node: GuideNode) => GuideNode; key?: string }
  | { type: 'add'; node: GuideNode; afterId?: string }
  /** A climb drawn on a topo: listed after the topo's climbs, in its legend and, given `pathId`, on that route. */
  | { type: 'addClimbToTopo'; topoId: string; climb: Climb; pathId?: string }
  | { type: 'delete'; id: string }
  | { type: 'move'; id: string; by: -1 | 1 }
  /** Drag and drop: `to` is the gap the node is dropped in, 0 (before the first) to the node count (after the last). */
  | { type: 'moveTo'; id: string; to: number }
  | { type: 'replace'; guide: Guide }
  /** The guide changed under the editor (others' saves merged in): not an undo step, and earlier steps no longer apply. */
  | { type: 'rebase'; guide: Guide }
  | { type: 'undo' }
  | { type: 'redo' }

export const nodeId = (n: GuideNode) => (n.type === 'unknown' ? '' : n.id)

export const initEditor = (guide: Guide): EditorState => ({ present: guide, past: [], future: [], lastKey: null })

const MAX_HISTORY = 200

function push(state: EditorState, next: Guide, key: string | null): EditorState {
  // Same key as the previous edit: fold into it instead of adding an undo step.
  if (key !== null && key === state.lastKey) return { ...state, present: next, future: [] }
  return { present: next, past: [...state.past, state.present].slice(-MAX_HISTORY), future: [], lastKey: key }
}

/** When the header's "Auto number" option is on, climbs and problems are numbered "1.", "2." … in order, as in the legacy editor. */
export function autonumber(guide: Guide): Guide {
  const header = guide.nodes.find((n) => n.type === 'header')
  if (header?.autonumber !== 'true') return guide
  let next = 1
  const nodes = guide.nodes.map((n) => {
    if (n.type !== 'climb' && n.type !== 'problem') return n
    const number = `${next++}.`
    return n.number === number ? n : { ...n, number }
  })
  return { ...guide, nodes }
}

export function editorReducer(state: EditorState, action: Action): EditorState {
  const next = reduce(state, action)
  if (next.present === state.present) return next
  const numbered = autonumber(next.present)
  return numbered === next.present ? next : { ...next, present: numbered }
}

function reduce(state: EditorState, action: Action): EditorState {
  const { present } = state
  const withNodes = (nodes: GuideNode[]): Guide => ({ ...present, nodes })

  switch (action.type) {
    case 'edit':
      return push(
        state,
        withNodes(present.nodes.map((n) => (nodeId(n) === action.id ? action.update(n) : n))),
        action.key ?? null,
      )
    case 'add': {
      const at = action.afterId ? present.nodes.findIndex((n) => nodeId(n) === action.afterId) + 1 : present.nodes.length
      return push(state, withNodes(present.nodes.toSpliced(at, 0, action.node)), null)
    }
    case 'addClimbToTopo': {
      const at = present.nodes.findIndex((n) => n.type === 'image' && n.id === action.topoId)
      if (at < 0) return state
      const { insertAt } = topoSection(present.nodes, at)
      const { climb, pathId } = action
      const climbs = present.nodes.slice(0, insertAt).filter((n): n is Climb => n.type === 'climb' || n.type === 'problem')
      const numbered = { ...climb, number: climb.number || nextNumber(climbs.at(-1)?.number ?? '') }
      const nodes = present.nodes.map((n) =>
        n.type === 'image' && n.id === action.topoId
          ? { ...n, legend: [...n.legend, climb.id], paths: n.paths.map((p) => (p.id === pathId ? { ...p, linkedTo: climb.id } : p)) }
          : n,
      )
      return push(state, withNodes(nodes.toSpliced(insertAt, 0, numbered)), null)
    }
    case 'delete':
      return push(state, withNodes(present.nodes.filter((n) => nodeId(n) !== action.id)), null)
    case 'move': {
      const from = present.nodes.findIndex((n) => nodeId(n) === action.id)
      const to = from + action.by
      if (from < 0 || to < 0 || to >= present.nodes.length) return state
      const nodes = present.nodes.slice()
      ;[nodes[from], nodes[to]] = [nodes[to], nodes[from]]
      return push(state, withNodes(nodes), null)
    }
    case 'moveTo': {
      const from = present.nodes.findIndex((n) => nodeId(n) === action.id)
      // Dropping into the gap either side of the node leaves it where it is.
      if (from < 0 || action.to === from || action.to === from + 1) return state
      const nodes = present.nodes.slice()
      const [node] = nodes.splice(from, 1)
      nodes.splice(action.to > from ? action.to - 1 : action.to, 0, node)
      return push(state, withNodes(nodes), null)
    }
    case 'replace':
      return push(state, action.guide, null)
    case 'rebase':
      return initEditor(action.guide)
    case 'undo': {
      const previous = state.past.at(-1)
      if (!previous) return state
      return { present: previous, past: state.past.slice(0, -1), future: [present, ...state.future], lastKey: null }
    }
    case 'redo': {
      const [next, ...rest] = state.future
      if (!next) return state
      return { present: next, past: [...state.past, present], future: rest, lastKey: null }
    }
  }
}

/** Next unused numeric id, looking at nodes and the paths/rects inside topos. */
export function nextId(guide: Guide): string {
  let max = 0
  const see = (id: string) => {
    const n = Number.parseInt(id, 10)
    if (n > max) max = n
  }
  for (const node of guide.nodes) {
    if (node.type === 'unknown') continue
    see(node.id)
    if (node.type === 'image') {
      node.paths.forEach((p) => see(p.id))
      node.rects.forEach((r) => see(r.id))
    }
  }
  return String(max + 1)
}

/** The number after `previous` in the guide's own style ("7." follows "6.", "12" follows "11"); blank when it is not a number. */
export function nextNumber(previous: string): string {
  const m = /^(\d+)(\.?)$/.exec(previous.trim())
  return m ? `${Number(m[1]) + 1}${m[2]}` : ''
}

/** Whether a guide is mostly boulder problems, so new climbs in it are problems too. */
export const climbKind = (guide: Guide): 'climb' | 'problem' => {
  const kinds = guide.nodes.filter((n) => n.type === 'climb' || n.type === 'problem')
  return kinds.filter((n) => n.type === 'problem').length * 2 > kinds.length ? 'problem' : 'climb'
}
