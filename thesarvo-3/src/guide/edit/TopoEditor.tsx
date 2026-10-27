import { useSizedTopo } from '#/guide/view/useSizedTopo'
import { Fragment, useEffect, useRef, useState } from 'react'
import { imageUrl } from '#/guide/content/paths'
import type { Climb, ImageTopo, LineStyle, Point, RectStyle } from '#/guide/model/types'
import { Callout, Route } from '#/guide/view/Topo'
import { labelSpots } from '#/guide/view/labelSpot'
import { RECT_STYLES } from '#/guide/view/topoStyles'
import { AreaField, Button, CheckField, CommitNumberField, DeleteButton, NumberField, SelectField, TextField } from './fields'
import { ClimbDialog, STARS } from './NodeForms'
import * as ops from './topoOps'
import { ZoomBox } from './ZoomBox'

type Tool = 'select' | 'route' | 'rect'
type Selection = { kind: 'path' | 'rect'; id: string } | null

type Props = {
  guideId: string
  topo: ImageTopo
  climbs: Climb[]
  newId: () => string
  /** `key` folds a burst of changes (a drag) into one undo step. */
  onChange: (update: (t: ImageTopo) => ImageTopo, key?: string) => void
  /** What the guide lists, so a new one is a climb or a boulder problem. */
  kind: 'climb' | 'problem'
  /** Adds a climb after this topo's climbs and to its legend; with `pathId`, on that route too. */
  onAddClimb: (pathId?: string) => void
  onEditClimb: (id: string, patch: Partial<Climb>, key: string) => void
}

const LINE_STYLES = [['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted']] as const
const END_MARKERS = [['', 'None'], ['belay', 'Belay'], ['lower', 'Lower-off'], ['lower-left', 'Lower-off left'], ['lower-right', 'Lower-off right']] as const
const ARROWS = [
  ['', 'None'], ['north', 'North'], ['north_east', 'North-east'], ['east', 'East'], ['south_east', 'South-east'],
  ['south', 'South'], ['south_west', 'South-west'], ['west', 'West'], ['north_west', 'North-west'],
] as const
const PRINT_LAYOUTS = ['auto', 'NotInPrint', 'OneColumn', 'TwoColumns', 'FitToPage', 'Rotate', 'DontRotate'].map((v) => [v, v] as const)
const RECT_OPTIONS = (Object.keys(RECT_STYLES) as RectStyle[]).map((s) => [s, s.replace(/_/g, ' ')] as const)

const ARROW_KEYS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
const SHORTCUTS = [
  ['Arrow keys', 'Nudge the selected point, route or label by 1px (Shift: 10px)'],
  ['Delete', 'Remove the selected point, route or label'],
  ['Enter', 'Finish the route you are drawing'],
  ['Esc', 'Stop drawing, or let go of the selection'],
  ['Space + drag', 'Pan the photo'],
  ['⌘/Ctrl + scroll', 'Zoom the photo'],
  ['?', 'Show or hide this list'],
] as const

/** How close (screen px) a new route's start must be to another route's end to join it. */
const SNAP_PX = 12

const TOOLS: [Tool, string][] = [['select', 'Select'], ['route', 'Draw route'], ['rect', 'Add label']]

export function TopoEditor({ guideId, topo: stored, climbs, newId, onChange, kind, onAddClimb, onEditClimb }: Props) {
  const topo = useSizedTopo(guideId, stored)
  const svgRef = useRef<SVGSVGElement>(null)
  const gesture = useRef(0)
  const [tool, setTool] = useState<Tool>('select')
  const [selection, setSelection] = useState<Selection>(null)
  const [pointIndex, setPointIndex] = useState<number | null>(null)
  const [drawing, setDrawing] = useState<Point[]>([])
  const [help, setHelp] = useState(false)
  /** The linked climb's full form is open in a popup. */
  const [details, setDetails] = useState(false)
  /** Screen pixels per photo pixel, to snap by a steady distance however far the photo is zoomed. */
  const zoom = useRef(1)

  const selectedPath = selection?.kind === 'path' ? topo.paths.find((p) => p.id === selection.id) : undefined
  const selectedRect = selection?.kind === 'rect' ? topo.rects.find((r) => r.id === selection.id) : undefined
  const climbById = new Map(climbs.map((c) => [c.id, c]))
  const spots = labelSpots(topo.paths, topo.width, topo.height)
  const linked = selectedPath && climbById.get(selectedPath.linkedTo)
  const noun = kind === 'problem' ? 'problem' : 'climb'

  /** Pointer position in image coordinates. */
  const toImage = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current!
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse())
    return { x: Math.round(p.x), y: Math.round(p.y) }
  }

  // Drawing something new lets go of the selection, so the panel never shows one route while you draw another.
  const startTool = (next: Tool) => {
    setTool(next)
    setDrawing([])
    if (next !== 'select') {
      setSelection(null)
      setPointIndex(null)
    }
  }

  const finishRoute = () => {
    if (drawing.length >= 2) {
      const id = newId()
      onChange((t) => ops.addPath(t, id, drawing, '', ops.newRouteArrow(t, kind)))
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
      // The climb popup has its own keys: Escape closes it, and Backspace must never delete the route behind it.
      if (typing || details) return
      if (e.key === 'Enter' && drawing.length) finishRoute()
      if (e.key === '?') setHelp((h) => !h)
      if (e.key === 'Escape') {
        setHelp(false)
        setDrawing([])
        setTool('select')
        setSelection(null)
        setPointIndex(null)
      }
      const arrow = ARROW_KEYS[e.key]
      if (arrow && selection && tool === 'select' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        const [dx, dy] = arrow.map((n) => n * (e.shiftKey ? 10 : 1))
        const key = `nudge-${selection.id}-${pointIndex}`
        if (selectedRect) onChange((t) => ops.nudgeRect(t, selectedRect.id, dx, dy), key)
        else if (selectedPath && pointIndex !== null) onChange((t) => ops.nudgePoint(t, selectedPath.id, pointIndex, dx, dy), key)
        else if (selectedPath) onChange((t) => ops.nudgePath(t, selectedPath.id, dx, dy), key)
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

  // Clicks, not presses: a press that pans or pinches the photo ends without one.
  const onBackgroundClick = (e: React.MouseEvent) => {
    const at = toImage(e)
    if (tool === 'route')
      setDrawing((d) => {
        // A new route's start joins the start or end of a route close by.
        if (!d.length) return [{ ...ops.snapPoint(topo, at, SNAP_PX / zoom.current), kind: '' }]
        return Math.hypot(d.at(-1)!.x - at.x, d.at(-1)!.y - at.y) < 3 ? d : [...d, { ...at, kind: '' }]
      })
    else if (tool === 'rect') {
      const id = newId()
      onChange((t) => ops.addRect(t, id, at))
      setSelection({ kind: 'rect', id })
      setTool('select')
    } else if (e.target === e.currentTarget) {
      setSelection(null)
      setPointIndex(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* While a drawing mode is active the other tools hide, leaving only the way out. */}
        {TOOLS.filter(([id]) => tool === 'select' || id === 'select').map(([id, label]) => (
          <Button key={id} variant={tool === id ? 'primary' : 'plain'} onClick={() => startTool(id)}>
            {tool === 'select' ? label : 'Done'}
          </Button>
        ))}
        {tool === 'route' && (
          <>
            <Button variant="primary" disabled={drawing.length < 2} onClick={finishRoute}>Finish route</Button>
            {drawing.length > 0 && <Button onClick={() => setDrawing([])}>Clear points</Button>}
          </>
        )}
        {tool === 'select' ? (
          <span className="text-xs text-muted">Drag handles to move, or use the arrow keys. Delete removes the selection.</span>
        ) : (
          <span className="flex items-center gap-2 rounded-md bg-amber/15 px-2 py-1 text-xs font-medium text-ink">
            <span className="size-2 animate-pulse rounded-full bg-amber" aria-hidden />
            {tool === 'route'
              ? 'Drawing a route: click the photo to add points. Enter finishes, Esc stops.'
              : 'Adding a label: click the photo to place it. Esc cancels.'}
          </span>
        )}
        <Button className="ml-auto" onClick={() => setHelp((h) => !h)} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">
          ?
        </Button>
      </div>
      {help && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border border-line bg-paper p-3 text-sm">
          {SHORTCUTS.map(([keys, what]) => (
            <Fragment key={keys}>
              <dt className="font-medium">{keys}</dt>
              <dd className="text-muted">{what}</dd>
            </Fragment>
          ))}
        </dl>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ZoomBox width={topo.width} height={topo.height} panOnDrag={tool === 'select'} className={`w-full rounded-lg bg-black/5 shadow-md ${tool === 'select' ? '' : 'ring-2 ring-amber'}`}>
          {(scale) => {
          // Handles keep one size on screen however far the photo is zoomed.
          zoom.current = scale
          const u = 1 / scale
          return (
          <>
          <img src={imageUrl(guideId, topo.src)} alt="" width={topo.width} height={topo.height} className="block size-full select-none" draggable={false} />
          <svg
            ref={svgRef}
            viewBox={`0 0 ${topo.width} ${topo.height}`}
            className={`absolute inset-0 size-full ${tool === 'select' ? '' : 'cursor-crosshair'}`}
            onClick={onBackgroundClick}
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
                <Route path={path} climb={climbById.get(path.linkedTo)} active={null} onActive={() => {}} labelAt={spots.get(path.id)} />
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
                    <rect x={rect.x - 2 * u} y={rect.y - 2 * u} width={rect.width + 4 * u} height={rect.height + 4 * u} fill="none" stroke="#0ea5e9" strokeWidth={2 * u} strokeDasharray={`${5 * u} ${3 * u}`} />
                    <rect
                      x={rect.x + rect.width - 6 * u}
                      y={rect.y + rect.height - 6 * u}
                      width={12 * u}
                      height={12 * u}
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
                r={(pointIndex === i ? 9 : 7) * u}
                fill={pointIndex === i ? '#0ea5e9' : '#fff'}
                stroke="#0ea5e9"
                strokeWidth={2 * u}
                className="cursor-grab"
                onPointerDown={(e) => {
                  setPointIndex(i)
                  startDrag(e, (p) => (t) => ops.movePoint(t, selectedPath.id, i, p))
                }}
              />
            ))}
            {drawing.length > 0 && (
              <g pointerEvents="none">
                <polyline points={drawing.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#0ea5e9" strokeWidth={3 * u} strokeDasharray={`${6 * u} ${4 * u}`} />
                {drawing.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={5 * u} fill="#0ea5e9" />)}
              </g>
            )}
          </svg>
          </>
          )
          }}
        </ZoomBox>

        {/* On wide screens the panel is sized by the photo, so switching panels never changes the page height. */}
        <div className="relative lg:min-h-80">
        <aside className="space-y-3 rounded-lg border border-line bg-paper p-3 lg:absolute lg:inset-0 lg:overflow-y-auto">
          {selectedPath ? (
            <>
              <h4 className="font-semibold">Route</h4>
              <SelectField
                label="Climb"
                value={selectedPath.linkedTo}
                options={[['', '— none —'], ...climbs.map((c) => [c.id, `${c.number} ${c.name}`.trim() || c.id] as const)]}
                onChange={(linkedTo) => onChange((t) => ops.updatePath(t, selectedPath.id, { linkedTo }))}
              />
              {linked ? (
                <>
                  <ClimbQuickFields climb={linked} onEdit={onEditClimb} />
                  <Button onClick={() => setDetails(true)}>All {noun} details…</Button>
                  {details && (
                    <ClimbDialog node={linked} onChange={(patch) => onEditClimb(linked.id, patch, `${linked.id}-${Object.keys(patch).join()}`)} onClose={() => setDetails(false)} />
                  )}
                </>
              ) : (
                <Button
                  onClick={() => {
                    // The new climb is linked at once, so the popup opens on it for the rest of its details.
                    onAddClimb(selectedPath.id)
                    setDetails(true)
                  }}
                >
                  New {noun} for this route
                </Button>
              )}
              <SelectField label="Line" value={selectedPath.lineStyle} options={LINE_STYLES} onChange={(lineStyle: LineStyle) => onChange((t) => ops.updatePath(t, selectedPath.id, { lineStyle }))} />
              <SelectField
                label="End marker"
                value={selectedPath.points.at(-1)?.kind ?? ''}
                options={END_MARKERS}
                onChange={(marker) => onChange((t) => ops.setEndMarker(t, selectedPath.id, marker))}
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
                <DeleteButton label={pointIndex === null ? 'Delete route' : 'Delete point'} onConfirm={removeSelected} />
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
              <DeleteButton label="Delete label" onConfirm={removeSelected} />
            </>
          ) : (
            <>
              <h4 className="font-semibold">Topo</h4>
              <CommitNumberField
                label="Width (px): the most it is shown at; routes scale with it"
                value={topo.width}
                onCommit={(width) => onChange((t) => ops.resize({ ...t, width: topo.width, height: topo.height }, width))}
              />
              <h4 className="font-semibold">Legend</h4>
              <TextField label="Title" value={topo.legendTitle} onChange={(legendTitle) => onChange((t) => ({ ...t, legendTitle }), 'legend-title')} />
              <TextField label="Footer" value={topo.legendFooter} onChange={(legendFooter) => onChange((t) => ({ ...t, legendFooter }), 'legend-footer')} />
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Legend x" value={topo.legendX} onChange={(legendX) => onChange((t) => ({ ...t, legendX }), 'legend-x')} />
                <NumberField label="Legend y" value={topo.legendY} onChange={(legendY) => onChange((t) => ({ ...t, legendY }), 'legend-y')} />
              </div>
              <SelectField label="Print layout" value={topo.printLayout} options={PRINT_LAYOUTS} onChange={(printLayout) => onChange((t) => ({ ...t, printLayout }))} />
              <CheckField label="Not in print version" checked={topo.noPrint} onChange={(noPrint) => onChange((t) => ({ ...t, noPrint }))} />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted">Climbs shown (in tick order)</p>
                <Button onClick={() => onAddClimb()}>Add {noun}</Button>
              </div>
              <ul className="space-y-0.5">
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
    </div>
  )
}

/** The fields a topo's reader sees, editable without leaving the topo. */
function ClimbQuickFields({ climb, onEdit }: { climb: Climb; onEdit: Props['onEditClimb'] }) {
  const field = (name: 'number' | 'name' | 'grade', label: string) => (
    <TextField label={label} value={climb[name]} onChange={(v) => onEdit(climb.id, { [name]: v }, `${climb.id}-${name}`)} />
  )
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-2">
      {field('number', 'No.')}
      {field('name', 'Name')}
      <SelectField label="Stars" value={climb.stars} options={STARS} onChange={(stars) => onEdit(climb.id, { stars }, `${climb.id}-stars`)} />
      {field('grade', 'Grade')}
    </div>
  )
}
