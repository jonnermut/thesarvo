// WGS84 / GDA94 lat-lon <-> UTM (Krüger series, accurate to well under a metre in a zone).
const A = 6378137
const F = 1 / 298.257223563
const K0 = 0.9996
const N = F / (2 - F)
const RADIUS = (A / (1 + N)) * (1 + N ** 2 / 4 + N ** 4 / 64)
const ALPHA = [
  N / 2 - (2 / 3) * N ** 2 + (5 / 16) * N ** 3,
  (13 / 48) * N ** 2 - (3 / 5) * N ** 3,
  (61 / 240) * N ** 3,
]
const BETA = [
  N / 2 - (2 / 3) * N ** 2 + (37 / 96) * N ** 3,
  N ** 2 / 48 + N ** 3 / 15,
  (17 / 480) * N ** 3,
]
const E2 = F * (2 - F)

export type Utm = { zone: number; band: string; easting: number; northing: number }
export type LatLon = { lat: number; lon: number }

const rad = (deg: number) => (deg * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI
const centralMeridian = (zone: number) => rad((zone - 1) * 6 - 180 + 3)

const BANDS = 'CDEFGHJKLMNPQRSTUVWX'
const bandOf = (lat: number) => BANDS[Math.min(19, Math.max(0, Math.floor((lat + 80) / 8)))]

export function latLonToUtm({ lat, lon }: LatLon, forcedZone?: number): Utm {
  const zone = forcedZone ?? Math.floor((lon + 180) / 6) + 1
  const phi = rad(lat)
  const dLon = rad(lon) - centralMeridian(zone)
  // Conformal latitude
  const sinPhi = Math.sin(phi)
  const t = Math.sinh(Math.atanh(sinPhi) - Math.sqrt(E2) * Math.atanh(Math.sqrt(E2) * sinPhi))
  const xi = Math.atan2(t, Math.cos(dLon))
  const eta = Math.atanh(Math.sin(dLon) / Math.sqrt(1 + t * t))
  let x = eta
  let y = xi
  ALPHA.forEach((a, i) => {
    const j = 2 * (i + 1)
    x += a * Math.cos(j * xi) * Math.sinh(j * eta)
    y += a * Math.sin(j * xi) * Math.cosh(j * eta)
  })
  return {
    zone,
    band: bandOf(lat),
    easting: 500000 + K0 * RADIUS * x,
    northing: K0 * RADIUS * y + (lat < 0 ? 10000000 : 0),
  }
}

export function utmToLatLon({ zone, band, easting, northing }: Utm): LatLon {
  const south = band < 'N'
  const xi = (south ? northing - 10000000 : northing) / (K0 * RADIUS)
  const eta = (easting - 500000) / (K0 * RADIUS)
  let xi0 = xi
  let eta0 = eta
  BETA.forEach((b, i) => {
    const j = 2 * (i + 1)
    xi0 -= b * Math.sin(j * xi) * Math.cosh(j * eta)
    eta0 -= b * Math.cos(j * xi) * Math.sinh(j * eta)
  })
  const chi = Math.asin(Math.sin(xi0) / Math.cosh(eta0))
  // Invert the conformal latitude by fixed-point iteration.
  const e = Math.sqrt(E2)
  let phi = chi
  for (let i = 0; i < 6; i++) {
    phi = Math.asin(Math.tanh(Math.atanh(Math.sin(chi)) + e * Math.atanh(e * Math.sin(phi))))
  }
  const lon = centralMeridian(zone) + Math.atan2(Math.sinh(eta0), Math.cos(xi0))
  return { lat: deg(phi), lon: deg(lon) }
}

/** Parses a zone such as "55G" into its number and band. */
export function parseZone(zone: string): { zone: number; band: string } | undefined {
  const m = /^\s*(\d{1,2})\s*([C-HJ-NP-X])\s*$/i.exec(zone)
  return m ? { zone: Number(m[1]), band: m[2].toUpperCase() } : undefined
}
