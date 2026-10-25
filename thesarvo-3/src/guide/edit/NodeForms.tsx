import { latLonToUtm, parseZone, utmToLatLon } from '#/guide/model/utm'
import type { Climb, Gps, GpsPoint, Header, TextBlock } from '#/guide/model/types'
import { AreaField, Button, SelectField, TextField } from './fields'

type Change<T> = (patch: Partial<T>) => void

export function HeaderForm({ node, onChange }: { node: Header; onChange: Change<Header> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TextField label="Name" value={node.name} onChange={(name) => onChange({ name })} className="sm:col-span-2" />
      <TextField label="Walk" value={node.walk} onChange={(walk) => onChange({ walk })} />
      <TextField label="Sun" value={node.sun} onChange={(sun) => onChange({ sun })} />
      <TextField label="Rock" value={node.rock} onChange={(rock) => onChange({ rock })} />
      <AreaField label="Acknowledgement" value={node.acknowledgement} onChange={(acknowledgement) => onChange({ acknowledgement })} rows={2} className="sm:col-span-2" />
      <AreaField label="Introduction" value={node.intro} onChange={(intro) => onChange({ intro })} rows={6} className="sm:col-span-2" />
      <AreaField label="History" value={node.history} onChange={(history) => onChange({ history })} rows={6} className="sm:col-span-2" />
      <AreaField label="Access" value={node.access} onChange={(access) => onChange({ access })} className="sm:col-span-2" />
      <AreaField label="Camping" value={node.camping} onChange={(camping) => onChange({ camping })} rows={3} className="sm:col-span-2" />
    </div>
  )
}

const STARS = [['', 'None'], ['*', '★'], ['**', '★★'], ['***', '★★★']] as const

export function ClimbForm({ node, onChange }: { node: Climb; onChange: Change<Climb> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <TextField label="Number" value={node.number} onChange={(number) => onChange({ number })} />
      <TextField label="Name" value={node.name} onChange={(name) => onChange({ name })} className="sm:col-span-3" />
      <TextField label="Grade" value={node.grade} onChange={(grade) => onChange({ grade })} />
      <SelectField label="Stars" value={node.stars} options={STARS} onChange={(stars) => onChange({ stars })} />
      <TextField label="Length" value={node.length} onChange={(length) => onChange({ length })} className="sm:col-span-2" />
      <TextField label="Extra" value={node.extra} onChange={(extra) => onChange({ extra })} className="sm:col-span-2" />
      <TextField label="First ascent" value={node.fa} onChange={(fa) => onChange({ fa })} className="sm:col-span-2" />
      <AreaField label="Description" value={node.text} onChange={(text) => onChange({ text })} className="sm:col-span-6" />
    </div>
  )
}

const TEXT_CLASSES = [
  ['text', 'Paragraph'],
  ['heading1', 'Heading 1'],
  ['heading2', 'Heading 2'],
  ['heading3', 'Heading 3'],
  ['pagebreak', 'Page break'],
] as const

export function TextForm({ node, onChange }: { node: TextBlock; onChange: Change<TextBlock> }) {
  const known = TEXT_CLASSES.some(([c]) => c === node.cls)
  const options = known ? TEXT_CLASSES : ([...TEXT_CLASSES, [node.cls, node.cls]] as const)
  return (
    <div className="grid gap-3">
      <SelectField label="Style" value={node.cls} options={options} onChange={(cls) => onChange({ cls })} className="max-w-xs" />
      <AreaField label="Text" value={node.text} onChange={(text) => onChange({ text })} rows={5} />
    </div>
  )
}

/** Fills UTM from lat/lon (or the reverse when only UTM is present). Values are stored as legacy-style strings. */
function convertPoint(p: GpsPoint): Partial<GpsPoint> {
  const lat = parseFloat(p.latitude)
  const lon = parseFloat(p.longitude)
  if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
    const u = latLonToUtm({ lat, lon })
    return { zone: `${u.zone}${u.band}`, easting: String(Math.round(u.easting)), northing: String(Math.round(u.northing)) }
  }
  const zone = parseZone(p.zone)
  const easting = parseFloat(p.easting)
  const northing = parseFloat(p.northing)
  if (!zone || Number.isNaN(easting) || Number.isNaN(northing)) return {}
  const ll = utmToLatLon({ ...zone, easting, northing })
  return { latitude: ll.lat.toFixed(5), longitude: ll.lon.toFixed(5) }
}

const emptyPoint = (pid: string): GpsPoint => ({
  pid, code: '', description: '', zone: '55G', easting: '', northing: '', latitude: '', longitude: '', height: '', other: {},
})

export function GpsForm({ node, onChange }: { node: Gps; onChange: Change<Gps> }) {
  const setPoint = (i: number, patch: Partial<GpsPoint>) =>
    onChange({ points: node.points.map((p, j) => (j === i ? { ...p, ...patch } : p)) })
  const nextPid = String(Math.max(0, ...node.points.map((p) => Number(p.pid) || 0)) + 1)

  return (
    <div className="space-y-3">
      {node.points.map((p, i) => (
        <div key={p.pid} className="grid gap-2 rounded-lg border border-line bg-paper p-3 sm:grid-cols-6">
          <TextField label="Description" value={p.description} onChange={(description) => setPoint(i, { description })} className="sm:col-span-3" />
          <TextField label="Latitude" value={p.latitude} onChange={(latitude) => setPoint(i, { latitude })} />
          <TextField label="Longitude" value={p.longitude} onChange={(longitude) => setPoint(i, { longitude })} />
          <div className="flex items-end gap-2">
            <Button onClick={() => setPoint(i, convertPoint(p))}>Convert</Button>
            <Button variant="danger" onClick={() => onChange({ points: node.points.filter((_, j) => j !== i) })}>
              Remove
            </Button>
          </div>
          <TextField label="Zone" value={p.zone} onChange={(zone) => setPoint(i, { zone })} />
          <TextField label="Easting" value={p.easting} onChange={(easting) => setPoint(i, { easting })} />
          <TextField label="Northing" value={p.northing} onChange={(northing) => setPoint(i, { northing })} />
        </div>
      ))}
      <Button onClick={() => onChange({ points: [...node.points, emptyPoint(nextPid)] })}>Add point</Button>
    </div>
  )
}
