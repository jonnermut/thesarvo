import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MapView from './MapView'

const points = [{ pid: 'a', code: '', description: 'Crag', zone: '', easting: '', northing: '', latitude: '-42.9', longitude: '147.3', height: '' }]

describe('MapView', () => {
  it('keeps a basemap on each of two maps on one page as they switch', () => {
    const { container } = render(
      <>
        <MapView points={points} lines={[]} />
        <MapView points={points} lines={[]} />
      </>,
    )
    const maps = [...container.querySelectorAll('.leaflet-container')]
    const choices = maps.map((m) => m.querySelectorAll<HTMLInputElement>('.leaflet-control-layers-selector'))
    const shown = () => maps.map((m) => m.querySelectorAll('.leaflet-tile-pane > .leaflet-layer').length)
    expect(shown()).toEqual([1, 1])
    // Layers shared between maps moved to whichever map added them last, so switching on one map
    // took the other's tiles away, and switching on that one then threw.
    choices[0][1].click()
    choices[1][2].click()
    expect(shown()).toEqual([1, 1])
  })
})
