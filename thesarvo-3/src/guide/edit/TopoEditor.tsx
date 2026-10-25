import { useEffect, useRef, useState } from 'react'
import { imageUrl } from '#/guide/content/paths'
import type { Climb, ImageTopo, LineStyle, Point, RectStyle } from '#/guide/model/types'
import { Callout, Route } from '#/guide/view/Topo'
import { RECT_STYLES } from '#/guide/view/topoStyles'
import { AreaField, Button, CheckField, NumberField, SelectField, TextField } from './fields'
import * as ops from './topoOps'

type Tool = 'select' | 'route' | 'rect'
type Selection = { kind: 'path' | 'rect'; id: string } | null

type Props = {
  guideId: string
  topo: ImageTopo
  climbs: Climb[]
  newId: () => string
  /** `key` folds a burst of changes (a drag) into one undo step. */
  onChange: (update: (t: ImageTopo) => ImageTopo, key?: string) => void
}

const LINE_STYLES = [['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted']] as const
const END_MARKERS = [['', 'None'], ['belay', 'Belay'], ['lower', 'Lower-off'], ['lower-left', 'Lower-off left'], ['lower-right', 'Lower-off right']] as const
const ARROWS = [
  ['', 'None'], ['north', 'North'], ['north_east', 'North-east'], ['east', 'East'], ['south_east', 'South-east'],
  ['south', 'South'], ['south_west', 'South-west'], ['west', 'West'], ['north_west', 'North-west'],
] as const
const PRINT_LAYOUTS = ['auto', 'NotInPrint', 'OneColumn', 'TwoColumns', 'FitToPage', 'Rotate', 'DontRotate'].map((v) => [v, v] as const)
const RECT_OPTIONS = (Object.keys(RECT_STYLES) as RectStyle[]).map((s) => [s, s.replace(/_/g, ' ')] as const)

const TOOLS: [Tool, string][] = [['select', 'Select'], ['route', 'Draw route'], ['rect', 'Add label']]

export function TopoEditor({ guideId, topo, climbs, newId, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const gesture = useRef(0)
  const [tool, setTool] = useState<Tool>('select')
  const [selection, setSelection] = useState<Selection>(null)
  const [pointIndex, setPointIndex] = useState<number | null>(null)
  const [drawing, setDrawing] = useState<Point[]>([])

  const selectedPath = selection?.kind === 'path' ? topo.paths.find((p) => p.id === selection.id) : undefined
  const selectedRect = selection?.kind === 'rect' ? topo.rects.find((r) => r.id === selection.id) : undefined
  const climbById = new Map(climbs.map((c) => [c.id, c]))

  /** Pointer position in image coordinates. */
  const toImage = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current!
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse())
    return { x: Math.round(p.x), y: Math.round(p.y) }
  }

  const finishRoute = () => {
    if (drawing.length >= 2) {
      const id = newId()
      onChange((t) => ops.addPath(t, id, drawing))
      setSelection({ kind: 'path', id })
    }
    setDrawing([])
    setTool('select')
  }

  const removeSelected = () => {
    if (selectedPath && pointIndex !== null) {
      onChange((t) => ops.removePoint(t, selectedPath.id, pointIndex))
      setPointIndex(null)
      if (selectedPath.points.length <= 2) setSelection(null)
    } else if (selectedPath) {
      onChange((t) => ops.removePath(t, selectedPath.id))
      setSelection(null)
    } else if (selectedRect) {
      onChange((t) => ops.removeRect(t, selectedRect.id))
      setSelection(null)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)
      if (typing) return
      if (e.key === 'Enter' && drawing.length) finishRoute()
      if (e.key === 'Escape') {
        setDrawing([])
        setTool('select')
        setSelection(null)
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection) {
        e.preventDefault()
        removeSelected()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /** Starts a drag; moves are reported as one undo step. */
  const startDrag = (e: React.PointerEvent, onMove: (p: { x: number; y: number }) => (t: ImageTopo) => ImageTopo) => {
    e.stopPropagation()
    const key = `drag-${(gesture.current += 1)}`
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => onChange(onMove(toImage(ev)), key)
    const up = () => {
      target.removeEventListener('pointermove', move as EventListener)
      target.removeEventListener('pointerup', up)
    }
    target.addEventListener('pointermove', move as EventListener)
    target.addEventListener('pointerup', up)
  }

  const onBackgroundDown = (e: React.PointerEvent) => {
    const at = toImage(e)
    if (tool === 'route') setDrawing((d) => [...d, { ...at, kind: '' }])
    else if (tool === 'rect') {
      const id = newId()
      onChange((t) => ops.addRect(t, id, at))
      setSelection({ kind: 'rect', id })
      setTool('select')
    } else {
      setSelection(null)
      setPointIndex(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {TOOLS.map(([id, label]) => (
          <Button key={id} variant={tool === id ? 'primary' : 'plain'} onClick={() => { setTool(id); setDrawing([]) }}>
            {label}
          </Button>
        ))}
        {drawing.length > 0 && (
          <>
            <Button variant="primary" disabled={drawing.length < 2} onClick={finishRoute}>Finish route</Button>
            <Button onClick={() => setDrawing([])}>Cancel</Button>
          </>
        )}
        <span className="text-xs text-muted">
          {tool === 'route' ? 'Click to place points, Enter to finish.' : tool === 'rect' ? 'Click the photo to place a label.' : 'Drag handles to move. Delete removes the selection.'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="relative overflow-hidden rounded-lg bg-black/5 shadow-md">
          <img src={imageUrl(guideId, topo.src)} alt="" width={topo.width} height={topo.height} className="block h-auto w-full select-none" draggable={false} />
          <svg
            ref={svgRef}
            viewBox={`0 0 ${topo.width} ${topo.height}`}
            className={`absolute inset-0 size-full touch-none ${tool === 'select' ? '' : 'cursor-crosshair'}`}
            onPointerDown={onBackgroundDown}
            onDoubleClick={() => drawing.length && finishRoute()}
          >
            {topo.paths.map((path) => (
              <g
                key={path.id}
                onPointerDown={(e) => {
                  if (tool !== 'select') return
                  e.stopPropagation()
                  setSelection({ kind: 'path', id: path.id })
                  setPointIndex(null)
                }}
                className={selection?.id === path.id ? '[&_path:nth-child(2)]:stroke-amber' : ''}
              >
                <Route path={path} climb={climbById.get(path.linkedTo)} active={null} onActive={() => {}} />
              </g>
            ))}
            {topo.rects.map((rect) => (
              <g
                key={rect.id}
                onPointerDown={(e) => {
                  if (tool !== 'select') return
                  setSelection({ kind: 'rect', id: rect.id })
                  const dx = toImage(e).x - rect.x
                  const dy = toImage(e).y - rect.y
                  startDrag(e, (p) => (t) => ops.updateRect(t, rect.id, { x: p.x - dx, y: p.y - dy }))
                }}
                className="cursor-move"
              >
                <Callout rect={rect} />
                {selection?.id === rect.id && (
                  <>
                    <rect x={rect.x - 2} y={rect.y - 2} width={rect.width + 4} height={rect.height + 4} fill="none" stroke="#0ea5e9" strokeWidth={2} strokeDasharray="5 3" />
                    <rect
                      x={rect.x + rect.width - 6}
                      y={rect.y + rect.height - 6}
                      width={12}
                      height={12}
                      fill="#0ea5e9"
                      className="cursor-nwse-resize"
                      onPointerDown={(e) => startDrag(e, (p) => (t) => ops.updateRect(t, rect.id, { width: Math.max(20, p.x - rect.x), height: Math.max(16, p.y - rect.y) }))}
                    />
                  </>
                )}
              </g>
            ))}
            {selectedPath?.points.map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={pointIndex === i ? 9 : 7}
                fill={pointIndex === i ? '#0ea5e9' : '#fff'}
                stroke="#0ea5e9"
                strokeWidth={2}
                className="cursor-grab"
                onPointerDown={(e) => {
                  setPointIndex(i)
                  startDrag(e, (p) => (t) => ops.movePoint(t, selectedPath.id, i, p))
                }}
              />
            ))}
            {drawing.length > 0 && (
              <g pointerEvents="none">
                <polyline points={drawing.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#0ea5e9" strokeWidth={3} strokeDasharray="6 4" />
                {drawing.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={5} fill="#0ea5e9" />)}
              </g>
            )}
          </svg>
        </div>

        <aside className="space-y-3 rounded-lg border border-line bg-paper p-3">
          {selectedPath ? (
            <>
              <h4 className="font-semibold">Route</h4>
              <SelectField
                label="Climb"
                value={selectedPath.linkedTo}
                options={[['', '— none —'], ...climbs.map((c) => [c.id, `${c.number} ${c.name}`.trim() || c.id] as const)]}
                onChange={(linkedTo) => onChange((t) => ops.updatePath(t, selectedPath.id, { linkedTo }))}
              />
              <SelectField label="Line" value={selectedPath.lineStyle} options={LINE_STYLES} onChange={(lineStyle: LineStyle) => onChange((t) => ops.updatePath(t, selectedPath.id, { lineStyle }))} />
              <SelectField
                label="End marker"
                value={selectedPath.points.at(-1)?.kind ?? ''}
                options={END_MARKERS}
                onChange={(kind) => onChange((t) => ops.setEndMarker(t, selectedPath.id, kind))}
              />
              <CheckField label="Arrow head" checked={selectedPath.arrow} onChange={(arrow) => onChange((t) => ops.updatePath(t, selectedPath.id, { arrow }))} />
              <TextField label="Label" value={selectedPath.labelText} onChange={(labelText) => onChange((t) => ops.updatePath(t, selectedPath.id, { labelText }), `label-${selectedPath.id}`)} />
              <div className="flex flex-wrap gap-2">
                <Button disabled={pointIndex === null || pointIndex >= selectedPath.points.length - 1} onClick={() => onChange((t) => ops.insertPointAfter(t, selectedPath.id, pointIndex!))}>
                  Insert point
                </Button>
                <Button
                  disabled={pointIndex === null}
                  onClick={() => {
                    if (pointIndex === null) return
                    const isLabel = selectedPath.points[pointIndex]?.kind === 'label'
                    onChange((t) => ops.setPointKind(t, selectedPath.id, pointIndex, isLabel ? '' : 'label'))
                  }}
                >
                  {pointIndex !== null && selectedPath.points[pointIndex]?.kind === 'label' ? 'Number not here' : 'Number here'}
                </Button>
                <Button variant="danger" onClick={removeSelected}>{pointIndex === null ? 'Delete route' : 'Delete point'}</Button>
              </div>
            </>
          ) : selectedRect ? (
            <>
              <h4 className="font-semibold">Label</h4>
              <AreaField label="Text" value={selectedRect.text} rows={3} onChange={(text) => onChange((t) => ops.updateRect(t, selectedRect.id, { text }), `rect-${selectedRect.id}`)} />
              <SelectField label="Style" value={selectedRect.style} options={RECT_OPTIONS} onChange={(style) => onChange((t) => ops.updateRect(t, selectedRect.id, { style }))} />
              <SelectField label="Arrow" value={selectedRect.arrowDirection} options={ARROWS} onChange={(arrowDirection) => onChange((t) => ops.updateRect(t, selectedRect.id, { arrowDirection }))} />
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Width" value={selectedRect.width} onChange={(width) => onChange((t) => ops.updateRect(t, selectedRect.id, { width }), `w-${selectedRect.id}`)} />
                <NumberField label="Height" value={selectedRect.height} onChange={(height) => onChange((t) => ops.updateRect(t, selectedRect.id, { height }), `h-${selectedRect.id}`)} />
              </div>
              <Button variant="danger" onClick={removeSelected}>Delete label</Button>
            </>
          ) : (
            <>
              <h4 className="font-semibold">Legend</h4>
              <TextField label="Title" value={topo.legendTitle} onChange={(legendTitle) => onChange((t) => ({ ...t, legendTitle }), 'legend-title')} />
              <TextField label="Footer" value={topo.legendFooter} onChange={(legendFooter) => onChange((t) => ({ ...t, legendFooter }), 'legend-footer')} />
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Legend x" value={topo.legendX} onChange={(legendX) => onChange((t) => ({ ...t, legendX }), 'legend-x')} />
                <NumberField label="Legend y" value={topo.legendY} onChange={(legendY) => onChange((t) => ({ ...t, legendY }), 'legend-y')} />
              </div>
              <SelectField label="Print layout" value={topo.printLayout} options={PRINT_LAYOUTS} onChange={(printLayout) => onChange((t) => ({ ...t, printLayout }))} />
              <CheckField label="Not in print version" checked={topo.noPrint} onChange={(noPrint) => onChange((t) => ({ ...t, noPrint }))} />
              <p className="text-xs font-medium text-muted">Climbs shown (in tick order)</p>
              <ul className="max-h-56 space-y-0.5 overflow-y-auto">
                {climbs.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-white">
                      <input type="checkbox" checked={topo.legend.includes(c.id)} onChange={() => onChange((t) => ops.toggleLegend(t, c.id))} />
                      <span className="w-7 text-right text-muted">{c.number}</span>
                      <span className="truncate">{c.name || c.id}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
