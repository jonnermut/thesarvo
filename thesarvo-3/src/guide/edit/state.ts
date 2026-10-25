import type { Guide, GuideNode } from '#/guide/model/types'

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
  | { type: 'delete'; id: string }
  | { type: 'move'; id: string; by: -1 | 1 }
  | { type: 'replace'; guide: Guide }
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

export function editorReducer(state: EditorState, action: Action): EditorState {
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
    case 'delete':
      return push(state, withNodes(present.nodes.filter((n) => nodeId(n) !== action.id)), null)
    case 'move': {
      const from = present.nodes.findIndex((n) => nodeId(n) === action.id)
      const to = from + action.by
      if (from < 0 || to < 0 || to >= present.nodes.length) return state
      const nodes = present.nodes.slice()
      ;[nodes[from], nodes[to]] = [nodes[to]!, nodes[from]!]
      return push(state, withNodes(nodes), null)
    }
    case 'replace':
      return push(state, action.guide, null)
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
