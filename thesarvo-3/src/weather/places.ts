/** `bom` is the name of the place on the Bureau's site (bom.gov.au/places/tas/<bom>/forecast/), `swell` marks coast with a swell worth reading. */
export type Place = { name: string; note: string; bom: string; lat: number; lng: number; swell?: boolean }

/** Where climbers go, in the order of the guide's regions: south east, west, east, north east. */
export const PLACES: Place[] = [
  { name: 'Hobart', note: 'Southern crags', bom: 'hobart', lat: -42.8826, lng: 147.3257 },
  { name: 'Kunanyi / Mt Wellington', note: 'The Organ Pipes, Sphinx, Lost World', bom: 'wellington-park', lat: -42.8957, lng: 147.2371 },
  { name: 'Tasman Peninsula', note: 'Fortescue Bay, Cape Raoul, Cape Pillar and Mt Brown', bom: 'cape-pillar', lat: -43.237, lng: 148, swell: true },
  { name: 'Southwest', note: 'Adamsfield, Frenchmans Cap, Federation Peak, Gordon Gorge', bom: 'strathgordon', lat: -42.7677, lng: 146.0461 },
  { name: 'Strahan', note: 'The west coast', bom: 'strahan', lat: -42.1558, lng: 145.3267 },
  { name: 'Sand River', note: 'Sand River, near Buckland', bom: 'buckland', lat: -42.607, lng: 147.7174 },
  { name: 'Freycinet', note: 'Whitewater Wall, the Hazards, Bicheno', bom: 'coles-bay', lat: -42.1207, lng: 148.2406, swell: true },
  { name: 'Launceston', note: 'Cataract Gorge, Duck Reach, Hillwood', bom: 'launceston', lat: -41.4376, lng: 147.135 },
  { name: 'Ben Lomond', note: 'Frews Flutes, Stacks Bluff', bom: 'ben-lomond', lat: -41.5594, lng: 147.6819 },
  { name: 'Flinders Island', note: 'Killiecrankie, Strzelecki', bom: 'whitemark', lat: -40.12, lng: 148.0154 },
]

export const bomStationUrl = (id: string) => `https://www.bom.gov.au/weatherstation/australia/tasmania/${id}`
export const bomForecastUrl = (p: Place) => `https://www.bom.gov.au/places/tas/${p.bom}/forecast/`
export const swellUrl = (p: Place) => `https://www.windy.com/-Waves-waves?waves,${p.lat},${p.lng},9`
export const WEATHER_PAGE_ID = '387'
