/** Where climbers go, in the order of the guide's regions. `lat` and `lng` pick the Bureau's forecast point and nearest station; `swell` links a sea forecast where the cliffs face the open ocean. */
export type Place = { name: string; note: string; lat: number; lng: number; swell?: boolean }

export const PLACES: Place[] = [
  { name: 'Hobart', note: 'Tolosa Street, Taroona, the Domain and the city crags', lat: -42.8826, lng: 147.3257 },
  { name: 'Kunanyi / Mt Wellington', note: 'The Organ Pipes, Sphinx, Lost World', lat: -42.8957, lng: 147.2371 },
  { name: 'Tasman Peninsula', note: 'Fortescue Bay, Cape Raoul, Cape Pillar, Tasman Island and Mt Brown', lat: -43.237, lng: 148, swell: true },
  { name: 'Southwest', note: 'Lake Pedder, Strathgordon, Frenchmans Cap', lat: -42.7677, lng: 146.0461 },
  { name: 'Strahan', note: 'The west coast', lat: -42.1558, lng: 145.3267 },
  { name: 'Freycinet', note: 'Coles Bay, the Hazards', lat: -42.1207, lng: 148.2406, swell: true },
  { name: 'Launceston', note: 'Cataract Gorge, Duck Reach', lat: -41.4376, lng: 147.135 },
  { name: 'Ben Lomond', note: 'The Knuckle, Jacobs Ladder', lat: -41.5594, lng: 147.6819 },
  { name: 'Flinders Island', note: 'Strzelecki Peaks, Killiecrankie', lat: -40.12, lng: 148.0154 },
  { name: 'Cradle Mountain', note: 'Cradle, Barn Bluff, Mt Roland', lat: -41.6836, lng: 145.9506 },
]

/** The Bureau's page for a weather station (the one whose readings are shown). */
export const bomStationUrl = (id: string) => `https://www.bom.gov.au/weatherstation/australia/tasmania/${id}`

/** Swell and wave maps centred on the cliffs (Windy; the Bureau's API does not give swell). */
export const swellUrl = (p: Place) => `https://www.windy.com/-Waves-waves?waves,${p.lat},${p.lng},9`

/** The content page (Weather, under More) that shows the live forecasts above its list of links. */
export const WEATHER_PAGE_ID = '387'
