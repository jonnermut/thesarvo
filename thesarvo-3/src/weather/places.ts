/** Where climbers go, with the nearest town the Bureau forecasts for in `bom` (its page under bom.gov.au/places/tas/). */
export type Place = { name: string; note: string; lat: number; lng: number; bom: string }

export const PLACES: Place[] = [
  { name: 'Kunanyi / Mt Wellington', note: 'Hobart, the Organ Pipes', lat: -42.8957, lng: 147.2371, bom: 'hobart' },
  { name: 'Tasman Peninsula', note: 'Fortescue Bay, Cape Raoul, Tasman Island', lat: -43.1456, lng: 147.8548, bom: 'port-arthur' },
  { name: 'Freycinet', note: 'Coles Bay, the Hazards', lat: -42.1207, lng: 148.2406, bom: 'coles-bay' },
  { name: 'Launceston', note: 'Cataract Gorge, Duck Reach', lat: -41.4376, lng: 147.135, bom: 'launceston' },
  { name: 'Ben Lomond', note: 'The Knuckle, Jacobs Ladder', lat: -41.5594, lng: 147.6819, bom: 'ben-lomond' },
  { name: 'Cradle Mountain', note: 'Cradle, Barn Bluff, Mt Roland', lat: -41.6836, lng: 145.9506, bom: 'cradle-mountain' },
  { name: 'Stanley', note: 'The Nut, the north-west coast', lat: -40.763, lng: 145.2988, bom: 'stanley' },
  { name: 'Mt Field / Southwest', note: 'Mt Field, Lake Pedder, Frenchmans Cap', lat: -42.6877, lng: 146.7119, bom: 'national-park' },
  { name: 'Strahan', note: 'The west coast', lat: -42.1558, lng: 145.3267, bom: 'strahan' },
  { name: 'Bicheno', note: 'The east coast', lat: -41.8727, lng: 148.2964, bom: 'bicheno' },
]

export const bomPlaceUrl = (p: Place) => `https://www.bom.gov.au/places/tas/${p.bom}/`

/** The content page (Weather, under More) that shows the live forecasts above its list of links. */
export const WEATHER_PAGE_ID = '387'
