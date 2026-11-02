import type { Point } from '#/guide/model/types'

export const isMarkerKind = (kind: string) => kind === 'belay' || kind.startsWith('lower')

/** The points that carry a belay or lower-off icon. As in the legacy plugin that is every such point, so the mid-belays of a multipitch show as well as the last one. */
export const markerPoints = (points: Point[]) => points.filter((p) => isMarkerKind(p.kind))
