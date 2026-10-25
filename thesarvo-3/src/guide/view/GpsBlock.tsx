import { lazy, Suspense, useEffect, useState } from 'react'
import type { Gps } from '#/guide/model/types'

const MapView = lazy(() => import('#/guide/islands/MapView'))

const mapsUrl = (lat: string, lon: string) =>
  `https://www.google.com/maps?q=${lat},${lon}`

export function GpsBlock({ gps }: { gps: Gps }) {
  // Open by default, but only after mount: Leaflet needs the browser.
  const [showMap, setShowMap] = useState(false)
  useEffect(() => setShowMap(true), [])
  if (!gps.points.length) return null
  return (
    <section className="my-6">
      <div className="flex items-end justify-between gap-4">
        <h2 className="border-b border-line text-2xl text-navy flex-1">GPS</h2>
        <button
          type="button"
          onClick={() => setShowMap((v) => !v)}
          className="rounded bg-paper border border-line px-3 py-1.5 text-[13px] text-navy hover:bg-black/5"
        >
          {showMap ? 'Hide map' : 'Show map'}
        </button>
      </div>
      {showMap && (
        <div className="mt-3">
          <Suspense
            fallback={
              <div className="grid h-80 place-items-center rounded-lg bg-black/5 text-muted">
                Loading map…
              </div>
            }
          >
            <MapView points={gps.points} lines={gps.lines} />
          </Suspense>
        </div>
      )}
      <details className="group mt-3">
        <summary className="cursor-pointer select-none text-[13px] text-link hover:underline">
          <span className="group-open:hidden">
            Show all {gps.points.length} points
          </span>
          <span className="hidden group-open:inline">Hide points</span>
        </summary>
        <div className="mt-2 overflow-x-auto border border-line bg-card">
          <table className="w-full text-[13px]">
            <thead className="bg-paper text-left text-muted">
              <tr>
                <th className="px-3 py-1 font-medium">Point</th>
                <th className="px-3 py-1 font-medium">Lat / Lon</th>
                <th className="px-3 py-1 font-medium">UTM</th>
              </tr>
            </thead>
            <tbody>
              {gps.points.map((p) => (
                <tr key={p.pid} className="border-t border-line">
                  <td className="px-3 py-1 font-medium">
                    {p.description || p.code}
                  </td>
                  <td className="px-3 py-1 tabular-nums">
                    <a
                      className="text-link"
                      href={mapsUrl(p.latitude, p.longitude)}
                    >
                      {p.latitude}, {p.longitude}
                    </a>
                  </td>
                  <td className="px-3 py-1 text-muted tabular-nums">
                    {p.zone} {p.easting} {p.northing}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
