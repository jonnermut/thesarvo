import type {
  Climb,
  Gps,
  GpsLine,
  GpsShape,
  GpsPoint,
  Guide,
  GuideNode,
  Header,
  ImageTopo,
  LineStyle,
  Other,
  Point,
  RawElement,
  RectStyle,
  RoutePath,
  TextBlock,
  TopoRect,
} from '#/guide/model/types'
import { buildXml, parseXml } from './raw'

/** Reads known attributes (trimmed, "" when missing) and returns the rest as `other`. */
function pick<K extends string>(source: Record<string, string>, keys: readonly K[]) {
  const known = {} as Record<K, string>
  const other: Other = {}
  for (const key of keys) known[key] = (source[key] ?? '').trim()
  for (const [k, v] of Object.entries(source)) if (!keys.includes(k as K)) other[k] = v
  return { known, other }
}

const num = (s: string) => Number.parseFloat(s) || 0
const children = (el: RawElement, tag: string) => el.children.filter((c) => c.tag === tag)

// ---- points: "x,y, x,y, x,y,belay" ----

export function parsePoints(s: string): Point[] {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const [x, y, kind = ''] = token.replace(/,$/, '').split(',')
      return { x: num(x ?? ''), y: num(y ?? ''), kind }
    })
}

export const formatPoints = (points: Point[]) => points.map((p) => `${p.x},${p.y},${p.kind}`).join(' ')

// ---- XML -> model ----

const HEADER_KEYS = ['id', 'name', 'rock', 'sun', 'walk', 'access', 'camping', 'acknowledgement', 'intro', 'history', 'autonumber'] as const
const CLIMB_KEYS = ['id', 'name', 'number', 'grade', 'extra', 'length', 'stars', 'fa'] as const
const TEXT_KEYS = ['id', 'class'] as const
const IMAGE_KEYS = ['id', 'src', 'width', 'height', 'noPrint', 'printLayout', 'legendTitle', 'legendFooter', 'legendx', 'legendy'] as const
const PATH_KEYS = ['id', 'points', 'd', 'linkedTo', 'lineStyle', 'labelText', 'arrow'] as const
const RECT_KEYS = ['id', 'x', 'y', 'width', 'height', 'style', 'arrowDirection', 'text'] as const
const GPS_SHAPES = ['polyline', 'polygon', 'rectangle'] as const
const GPS_LINE_KEYS = ['pid', 'description'] as const
const GPS_POINT_KEYS = ['pid', 'code', 'description', 'zone', 'easting', 'northing', 'latitude', 'longitude', 'height'] as const

function headerFromXml(el: RawElement): Header {
  const { known, other } = pick(el.attrs, HEADER_KEYS)
  return { type: 'header', ...known, other }
}

function climbFromXml(el: RawElement): Climb {
  const { known, other } = pick(el.attrs, CLIMB_KEYS)
  return { type: el.tag === 'problem' ? 'problem' : 'climb', ...known, text: el.text, other }
}

function textFromXml(el: RawElement): TextBlock {
  const { known, other } = pick(el.attrs, TEXT_KEYS)
  return { type: 'text', id: known.id, cls: known.class || 'text', text: el.text, other }
}

function pathFromXml(el: RawElement): RoutePath {
  const { known, other } = pick(el.attrs, PATH_KEYS)
  return {
    id: known.id,
    points: parsePoints(known.points),
    d: known.d,
    linkedTo: known.linkedTo,
    lineStyle: (known.lineStyle || 'solid') as LineStyle,
    labelText: known.labelText,
    arrow: known.arrow === 'true',
    other,
  }
}

function rectFromXml(el: RawElement): TopoRect {
  const { known, other } = pick(el.attrs, RECT_KEYS)
  return {
    id: known.id,
    x: num(known.x),
    y: num(known.y),
    width: num(known.width),
    height: num(known.height),
    style: known.style as RectStyle,
    arrowDirection: known.arrowDirection,
    // Rect text is stored with <br/> line breaks (as in the rest of the guide).
    text: el.attrs.text ?? '',
    other,
  }
}

function imageFromXml(el: RawElement): ImageTopo {
  const { known, other } = pick(el.attrs, IMAGE_KEYS)
  const drawing = children(el, 'drawing').flatMap((d) => d.children)
  return {
    type: 'image',
    id: known.id,
    src: el.attrs.src ?? '',
    width: num(known.width),
    height: num(known.height),
    noPrint: known.noPrint === 'true',
    printLayout: known.printLayout,
    legendTitle: known.legendTitle,
    legendFooter: known.legendFooter,
    legendX: num(known.legendx),
    legendY: num(known.legendy),
    legend: children(el, 'legend').flatMap((l) => children(l, 'climb').map((c) => c.text.trim())),
    paths: drawing.filter((d) => d.tag === 'path').map(pathFromXml),
    rects: drawing.filter((d) => d.tag === 'rect').map(rectFromXml),
    otherShapes: drawing.filter((d) => d.tag !== 'path' && d.tag !== 'rect'),
    other,
  }
}

function gpsFromXml(el: RawElement): Gps {
  const points: GpsPoint[] = children(el, 'point').map((p) => {
    const { known, other } = pick(p.attrs, GPS_POINT_KEYS)
    return { ...known, other }
  })
  const lines: GpsLine[] = el.children
    .filter((c) => (GPS_SHAPES as readonly string[]).includes(c.tag))
    .map((l) => {
      const { known, other } = pick(l.attrs, GPS_LINE_KEYS)
      return { ...known, shape: l.tag as GpsShape, path: l.text.trim(), other }
    })
  return { type: 'gps', id: el.attrs.id ?? '', points, lines, other: {} }
}

function nodeFromXml(el: RawElement): GuideNode {
  switch (el.tag) {
    case 'header': return headerFromXml(el)
    case 'climb':
    case 'problem': return climbFromXml(el)
    case 'text': return textFromXml(el)
    case 'image': return imageFromXml(el)
    case 'gps': return gpsFromXml(el)
    default: return { type: 'unknown', raw: el }
  }
}

export function guideFromXml(id: string, xml: string): Guide {
  const root = parseXml(xml)
  const { known, other } = pick(root.attrs, ['guidestars'] as const)
  return { id, guideStars: known.guidestars, nodes: root.children.map(nodeFromXml), other }
}

// ---- model -> XML ----

/** Writes only non-empty attributes, to keep files small. */
function attrs(known: Record<string, string>, other: Other = {}): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(known)) if (v !== '') out[k] = v
  return { ...out, ...other }
}

const el = (tag: string, a: Record<string, string>, kids: RawElement[] = [], text = ''): RawElement => ({
  tag,
  attrs: a,
  children: kids,
  text,
})

function pathToXml(p: RoutePath): RawElement {
  return el('path', attrs({
    id: p.id,
    points: formatPoints(p.points),
    d: p.d,
    linkedTo: p.linkedTo,
    lineStyle: p.lineStyle === 'solid' ? '' : p.lineStyle,
    labelText: p.labelText,
    arrow: p.arrow ? 'true' : '',
  }, p.other))
}

function rectToXml(r: TopoRect): RawElement {
  return el('rect', attrs({
    id: r.id,
    x: String(r.x),
    y: String(r.y),
    width: String(r.width),
    height: String(r.height),
    style: r.style,
    arrowDirection: r.arrowDirection,
    text: r.text,
  }, r.other))
}

function nodeToXml(n: GuideNode): RawElement {
  switch (n.type) {
    case 'header': {
      const { type: _t, other, ...fields } = n
      return el('header', attrs(fields, other))
    }
    case 'climb':
    case 'problem': {
      const { type, other, text, ...fields } = n
      return el(type, attrs(fields, other), [], text)
    }
    case 'text':
      return el('text', attrs({ id: n.id, class: n.cls }, n.other), [], n.text)
    case 'image': {
      const legend = n.legend.length ? [el('legend', {}, n.legend.map((id) => el('climb', {}, [], id)))] : []
      const shapes = [...n.paths.map(pathToXml), ...n.rects.map(rectToXml), ...n.otherShapes]
      return el('image', attrs({
        id: n.id,
        src: n.src,
        width: String(n.width),
        height: String(n.height),
        noPrint: n.noPrint ? 'true' : '',
        printLayout: n.printLayout,
        legendTitle: n.legendTitle,
        legendFooter: n.legendFooter,
        legendx: n.legendX ? String(n.legendX) : '',
        legendy: n.legendY ? String(n.legendY) : '',
      }, n.other), [...legend, el('drawing', {}, shapes)])
    }
    case 'gps':
      return el('gps', attrs({ id: n.id }, n.other), [
        ...n.points.map(({ other, ...p }) => el('point', attrs(p, other))),
        ...n.lines.map(({ other, path, shape, ...l }) => el(shape, attrs(l, other), [], path)),
      ])
    case 'unknown':
      return n.raw
  }
}

export function guideToXml(guide: Guide): string {
  const root = el('guide', attrs({ guidestars: guide.guideStars }, guide.other), guide.nodes.map(nodeToXml))
  return buildXml(root)
}
