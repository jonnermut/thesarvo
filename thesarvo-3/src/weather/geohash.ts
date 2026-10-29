const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz'

/** The geohash of a point, `length` characters long (the Bureau's API asks for 7 for forecasts and 6 for observations). */
export function geohash(lat: number, lng: number, length: number): string {
  const range = { lat: [-90, 90], lng: [-180, 180] }
  let hash = ''
  let bits = 0
  let index = 0
  for (let even = true; hash.length < length; even = !even) {
    const [key, value] = even ? (['lng', lng] as const) : (['lat', lat] as const)
    const mid = (range[key][0] + range[key][1]) / 2
    index <<= 1
    if (value >= mid) {
      index |= 1
      range[key][0] = mid
    } else range[key][1] = mid
    if (++bits === 5) {
      hash += BASE32[index]
      bits = 0
      index = 0
    }
  }
  return hash
}
