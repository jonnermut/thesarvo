import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { routeStats } from '#/guide/view/routeStats'
import type { Climb, Guide, GuideNode } from '#/guide/model/types'
import { ClimbBlock } from '#/guide/view/ClimbBlock'
import { GpsBlock } from '#/guide/view/GpsBlock'
import { GuideView } from '#/guide/view/GuideView'
import { guideTitle } from '#/guide/view/kml'
import { HeaderBlock } from '#/guide/view/HeaderBlock'
import { TextBlock } from '#/guide/view/TextBlock'
import { ImagePicker } from './ImagePicker'
import { Button } from './fields'
import { fingerprint, localStore } from './drafts'
import type { Draft } from './drafts'
import { newNode, newTopo, NEW_NODE_LABELS } from './newNodes'
import { ClimbForm, GpsForm, HeaderForm, TextForm } from './NodeForms'
import { editorReducer, initEditor, nextId, nodeId } from './state'
import { TopoEditor } from './TopoEditor'
import { TopoFigure } from '#/guide/view/TopoFigure'

const SAVE_DELAY_MS = 400

/** Loads an image just to learn its size, which topos need up front. */
const measure = (src: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image()
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = src
  })

export default function Editor({ guide }: { guide: Guide }) {
  const base = useMemo(() => fingerprint(guide), [guide])
  const [state, dispatch] = useReducer(editorReducer, guide, initEditor)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)
  const [pendingDraft, setPendingDraft] = useState<Draft | null>(null)
  const loaded = useRef(false)
  const { present } = state

  // On first load, offer to restore a draft saved by an earlier session.
  useEffect(() => {
    const draft = localStore.loadDraft(guide.id)
    if (draft && fingerprint(draft.guide) !== base) setPendingDraft(draft)
    loaded.current = true
  }, [guide.id, base])

  // Persist every change (debounced), unless the guide is back to the published state.
  useEffect(() => {
    if (!loaded.current || pendingDraft) return
    const timer = setTimeout(() => {
      if (fingerprint(present) === base) localStore.clearDraft(guide.id)
      else localStore.saveDraft(guide.id, present, base)
    }, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [present, base, guide.id, pendingDraft])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return
      if (
        e.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA'].includes(e.target.tagName)
      )
        return
      e.preventDefault()
      dispatch({ type: e.shiftKey ? 'redo' : 'undo' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const climbs = present.nodes.filter(
    (n): n is Climb => n.type === 'climb' || n.type === 'problem',
  )
  const dirty = fingerprint(present) !== base

  const edit: EditFn = (id, patch, key) =>
    dispatch({
      type: 'edit',
      id,
      key,
      update: (n) => ({ ...n, ...patch }) as GuideNode,
    })
  /** Applies a function to the latest node, so fast drags never work from stale data. */
  const editWith: EditWithFn = (id, update, key) =>
    dispatch({ type: 'edit', id, key, update })

  const add = (node: GuideNode, afterId?: string) => {
    dispatch({ type: 'add', node, afterId })
    setEditingId(nodeId(node))
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="sticky top-14 z-10 -mx-4 mb-4 flex flex-wrap items-center gap-2 border-b border-line bg-paper/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <Button
          disabled={!state.past.length}
          onClick={() => dispatch({ type: 'undo' })}
        >
          Undo
        </Button>
        <Button
          disabled={!state.future.length}
          onClick={() => dispatch({ type: 'redo' })}
        >
          Redo
        </Button>
        <span className="mx-1 text-sm text-muted">
          {dirty ? 'Draft saved in this browser' : 'No changes'}
        </span>
        <div className="ml-auto flex gap-2">
          <Button onClick={() => setPreview((p) => !p)}>
            {preview ? 'Back to editing' : 'Preview'}
          </Button>
          <Button
            variant="danger"
            disabled={!dirty}
            onClick={() => {
              if (confirm('Discard all changes?'))
                dispatch({ type: 'replace', guide })
            }}
          >
            Discard
          </Button>
        </div>
      </div>

      {pendingDraft && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber bg-amber/10 p-3 text-sm">
          <span>
            You have unsaved changes from{' '}
            {new Date(pendingDraft.savedAt).toLocaleString()}.
          </span>
          <Button
            variant="primary"
            onClick={() => {
              dispatch({ type: 'replace', guide: pendingDraft.guide })
              setPendingDraft(null)
            }}
          >
            Restore
          </Button>
          <Button
            onClick={() => {
              localStore.clearDraft(guide.id)
              setPendingDraft(null)
            }}
          >
            Discard
          </Button>
        </div>
      )}

      {preview ? (
        <GuideView guide={present} />
      ) : (
        <div className="space-y-4">
          <InsertPoint guide={present} onAdd={add} />
          {present.nodes.map((node) => {
            if (node.type === 'unknown') return null
            const id = nodeId(node)
            const open = editingId === id
            return (
              <div key={id} className="space-y-4">
                <section
                  className={`rounded-xl border bg-card p-3 shadow-sm ${open ? 'border-amber' : 'border-line'}`}
                >
                  <div className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted">
                    <span className="font-semibold">{node.type}</span>
                    <span className="ml-auto flex gap-1.5">
                      <Button
                        onClick={() => dispatch({ type: 'move', id, by: -1 })}
                        aria-label="Move up"
                      >
                        ↑
                      </Button>
                      <Button
                        onClick={() => dispatch({ type: 'move', id, by: 1 })}
                        aria-label="Move down"
                      >
                        ↓
                      </Button>
                      <Button
                        variant={open ? 'primary' : 'plain'}
                        onClick={() => setEditingId(open ? null : id)}
                      >
                        {open ? 'Done' : 'Edit'}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => dispatch({ type: 'delete', id })}
                      >
                        Delete
                      </Button>
                    </span>
                  </div>
                  {open ? (
                    <NodeEditor
                      node={node}
                      climbs={climbs}
                      guide={present}
                      edit={edit}
                      editWith={editWith}
                    />
                  ) : (
                    <NodePreview
                      node={node}
                      guideId={guide.id}
                      guideName={guideTitle(guide)}
                      climbs={climbs}
                    />
                  )}
                </section>
                <InsertPoint guide={present} onAdd={(inserted) => add(inserted, id)} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function NodePreview({
  node,
  guideId,
  guideName,
  climbs,
}: {
  node: GuideNode
  guideId: string
  guideName: string
  climbs: Climb[]
}) {
  switch (node.type) {
    case 'header':
      return <HeaderBlock header={node} stats={routeStats(climbs)} />
    case 'climb':
    case 'problem':
      return <ClimbBlock climb={node} />
    case 'text':
      return <TextBlock block={node} />
    case 'image':
      return (
        <TopoFigure
          guideId={guideId}
          topo={node}
          climbs={new Map(climbs.map((c) => [c.id, c]))}
          active={null}
          onActive={() => {}}
        />
      )
    case 'gps':
      return <GpsBlock gps={node} guideName={guideName} />
    case 'unknown':
      return null
  }
}

type EditFn = (id: string, patch: Partial<GuideNode>, key?: string) => void
type EditWithFn = (
  id: string,
  update: (n: GuideNode) => GuideNode,
  key?: string,
) => void

function NodeEditor({
  node,
  climbs,
  guide,
  edit,
  editWith,
}: {
  node: GuideNode
  climbs: Climb[]
  guide: Guide
  edit: EditFn
  editWith: EditWithFn
}) {
  if (node.type === 'unknown') return null
  const key = (field: string) => `${node.id}-${field}`
  // Typing in one field is one undo step: the key is the node plus the first field changed.
  const change = (patch: Partial<GuideNode>) =>
    edit(node.id, patch, key(Object.keys(patch).join()))
  switch (node.type) {
    case 'header':
      return <HeaderForm node={node} onChange={change} />
    case 'climb':
    case 'problem':
      return <ClimbForm node={node} onChange={change} />
    case 'text':
      return <TextForm node={node} onChange={change} />
    case 'gps':
      return <GpsForm node={node} onChange={change} />
    case 'image':
      return (
        <TopoEditor
          guideId={guide.id}
          topo={node}
          climbs={climbs}
          newId={() => nextId(guide)}
          onChange={(update, k) =>
            editWith(node.id, (n) => (n.type === 'image' ? update(n) : n), k)
          }
        />
      )
  }
}

/** Thin "+ Insert" bar between nodes that opens the add-node toolbar at that position. */
function InsertPoint({
  guide,
  onAdd,
}: {
  guide: Guide
  onAdd: (node: GuideNode) => void
}) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-2 text-xs text-muted"
      >
        <span className="h-px flex-1 bg-line group-hover:bg-link" />
        <span className="group-hover:text-link">+ Insert</span>
        <span className="h-px flex-1 bg-line group-hover:bg-link" />
      </button>
    )
  }
  return (
    <AddNode
      guide={guide}
      onAdd={(node) => {
        onAdd(node)
        setOpen(false)
      }}
    />
  )
}

function AddNode({
  guide,
  onAdd,
}: {
  guide: Guide
  onAdd: (node: GuideNode) => void
}) {
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState('')

  const addImage = async (name: string) => {
    try {
      const { imageUrl } = await import('#/guide/content/paths')
      const size = await measure(imageUrl(guide.id, name))
      onAdd(newTopo(nextId(guide), name, size.width, size.height))
      setPicking(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-line p-3">
      <span className="text-sm font-medium text-muted">Add</span>
      {NEW_NODE_LABELS.map(([kind, label]) => (
        <Button key={kind} onClick={() => onAdd(newNode(kind, nextId(guide)))}>
          {label}
        </Button>
      ))}
      <Button onClick={() => setPicking(true)}>Topo image…</Button>
      {picking && (
        <ImagePicker guideId={guide.id} onPick={addImage} onClose={() => setPicking(false)} />
      )}
      {error && <span className="text-sm text-red-700">{error}</span>}
    </div>
  )
}
