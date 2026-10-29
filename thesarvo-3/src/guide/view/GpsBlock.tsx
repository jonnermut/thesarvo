import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { usePresence } from '#/components/overlay'
import type { Gps } from '#/guide/model/types'
import { gpsToGpx, gpsToKml } from './kml'

const MapView = lazy(() => import('#/guide/islands/MapView'))

const mapsUrl = (lat: string, lon: string) =>
  `https://www.google.com/maps?q=${lat},${lon}`

function download(name: string, ext: string, type: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${name || 'guide'}.${ext}`
  a.click()
  URL.revokeObjectURL(url)
}

const downloadKml = (name: string, gps: Gps) => download(name, 'kml', 'application/vnd.google-earth.kml+xml', gpsToKml(name, gps))
const downloadGpx = (name: string, gps: Gps) => download(name, 'gpx', 'application/gpx+xml', gpsToGpx(name, gps))

export const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 4v11m-5-5 5 5 5-5M5 20h14" />
  </svg>
)

/** A toggle in the GPS header's Map / Points pair. */
function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`px-2.5 py-1 first:rounded-l last:rounded-r ${on ? 'bg-navy text-white' : 'bg-paper text-navy hover:bg-black/5'}`}
    >
      {children}
    </button>
  )
}

export function GpsBlock({ gps, guideName = '' }: { gps: Gps; guideName?: string }) {
  // Open by default, but only after mount: Leaflet needs the browser.
  const [showMap, setShowMap] = useState(false)
  const [showPoints, setShowPoints] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const mapBox = useRef<HTMLDivElement>(null)
  // Slides open and shut when the reader asks, not when it first appears.
  const [toggled, setToggled] = useState(false)
  const mapMounted = usePresence(showMap)
  // Below an open map the list can start off screen: bring it into view as it opens, so the button visibly does something.
  const showTable = useCallback((el: HTMLDivElement | null) => el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), [])
  useEffect(() => setShowMap(true), [])
  if (!gps.points.length && !gps.lines.length) return null
  const hasCode = gps.points.some((p) => p.code)
  const hasHeight = gps.points.some((p) => p.height && p.height !== '0')
  return (
    <section className="my-6">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2 border-b border-line pb-1">
        <h2 className="flex-1 text-2xl text-navy">GPS</h2>
        <button
          type="button"
          onClick={() => downloadKml(guideName, gps)}
          title="Download the points for Google Earth"
          className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-link"
        >
          <DownloadIcon />
          KML
        </button>
        <button
          type="button"
          onClick={() => downloadGpx(guideName, gps)}
          title="Download the points for GPS units and apps such as Gaia"
          className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-link"
        >
          <DownloadIcon />
          GPX
        </button>
        <div className="flex divide-x divide-line overflow-hidden rounded border border-line text-[13px]">
          <Toggle
            on={showMap}
            onClick={() => {
              setToggled(true)
              setShowMap((v) => !v)
            }}
          >
            Map
          </Toggle>
          {gps.points.length > 0 && (
            <Toggle on={showPoints} onClick={() => setShowPoints((v) => !v)}>
              {gps.points.length} points <span aria-hidden>{showPoints ? '▴' : '▾'}</span>
            </Toggle>
          )}
        </div>
      </div>
      {mapMounted && (
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-180 ease-out ${toggled ? 'starting:grid-rows-[0fr] starting:opacity-0' : ''} ${showMap ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] opacity-0'}`}
        >
          <div ref={mapBox} className="mt-3 min-h-0 scroll-mt-20 overflow-hidden">
            <Suspense fallback={<div className="grid h-80 place-items-center rounded-lg bg-black/5 text-muted">Loading map…</div>}>
              <MapView points={gps.points} lines={gps.lines} selected={selected} onSelect={setSelected} />
            </Suspense>
          </div>
        </div>
      )}
      {showPoints && (
        <div
          ref={showTable}
          className="mt-3 scroll-mt-20 overflow-x-auto border border-line bg-card"
        >
          <table className="w-full text-[13px]">
            <thead className="bg-paper text-left text-muted">
              <tr>
                {hasCode && <th className="px-3 py-1 font-medium">Code</th>}
                <th className="px-3 py-1 font-medium">Point</th>
                <th className="px-3 py-1 font-medium">Lat / Lon</th>
                <th className="px-3 py-1 font-medium">UTM</th>
                {hasHeight && <th className="px-3 py-1 font-medium">Height</th>}
              </tr>
            </thead>
            <tbody>
              {/* By position: some guides repeat a pid, and rows keyed on it were left behind from other guides. */}
              {gps.points.map((p, i) => (
                <tr
                  key={i}
                  onClick={() => {
                    setSelected(p.pid)
                    if (!showMap) setShowMap(true)
                    mapBox.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                  }}
                  className={`cursor-pointer border-t border-line hover:bg-amber/10 ${selected === p.pid ? 'bg-amber/20' : ''}`}
                >
                  {hasCode && <td className="px-3 py-1 text-muted">{p.code}</td>}
                  <td className="px-3 py-1 font-medium">{p.description || p.code}</td>
                  <td className="px-3 py-1 tabular-nums">
                    <a className="text-link" onClick={(e) => e.stopPropagation()} href={mapsUrl(p.latitude, p.longitude)}>
                      {p.latitude}, {p.longitude}
                    </a>
                  </td>
                  <td className="px-3 py-1 text-muted tabular-nums">
                    {p.zone} {p.easting} {p.northing}
                  </td>
                  {hasHeight && <td className="px-3 py-1 tabular-nums">{p.height}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
