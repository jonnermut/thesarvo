import { lazy, Suspense, useState } from 'react'
import type { Gps } from '#/guide/model/types'

const MapView = lazy(() => import('#/guide/islands/MapView'))

const mapsUrl = (lat: string, lon: string) => `https://www.google.com/maps?q=${lat},${lon}`

export function GpsBlock({ gps }: { gps: Gps }) {
  const [showMap, setShowMap] = useState(false)
  if (!gps.points.length) return null
  return (
    <section className="my-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold text-forest">GPS</h2>
        <button
          type="button"
          onClick={() => setShowMap((v) => !v)}
          className="rounded-md bg-forest px-3 py-1.5 text-sm font-medium text-white hover:bg-forest-soft"
        >
          {showMap ? 'Hide map' : 'Open map'}
        </button>
      </div>
      {showMap && (
        <div className="mt-3">
          <Suspense fallback={<div className="grid h-80 place-items-center rounded-lg bg-black/5 text-muted">Loading map…</div>}>
            <MapView points={gps.points} />
          </Suspense>
        </div>
      )}
      <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-card">
        <table className="w-full text-sm">
          <thead className="bg-paper text-left text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Point</th>
              <th className="px-3 py-2 font-medium">Lat / Lon</th>
              <th className="px-3 py-2 font-medium">UTM</th>
            </tr>
          </thead>
          <tbody>
            {gps.points.map((p) => (
              <tr key={p.pid} className="border-t border-line">
                <td className="px-3 py-2 font-medium">{p.description || p.code}</td>
                <td className="px-3 py-2 tabular-nums">
                  <a className="text-forest underline decoration-amber underline-offset-2" href={mapsUrl(p.latitude, p.longitude)}>
                    {p.latitude}, {p.longitude}
                  </a>
                </td>
                <td className="px-3 py-2 text-muted tabular-nums">
                  {p.zone} {p.easting} {p.northing}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
