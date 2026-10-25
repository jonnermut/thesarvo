import type { LineStyle, RectStyle } from '#/guide/model/types'

export const ROUTE_COLOUR = '#ffffff'
/** Route end marker and start-number fills, as on the live guide. */
export const MARKER_NAVY = '#262262'

export const RECT_STYLES: Record<RectStyle, { fill: string; stroke: string; text: string }> = {
  black_text_on_solid_white: { fill: '#fff', stroke: 'none', text: '#000' },
  white_text_on_solid_black: { fill: '#000', stroke: 'none', text: '#fff' },
  black_text_on_solid_yellow: { fill: '#F7941E', stroke: 'none', text: '#000' },
  white_outline: { fill: 'none', stroke: '#fff', text: '#fff' },
  yellow_outline: { fill: 'none', stroke: '#F7941E', text: '#F7941E' },
}

export const DASH: Record<LineStyle, string | undefined> = {
  solid: undefined,
  dashed: '10 7',
  dotted: '1 7',
}
