import type { GuideNode, RawElement } from '#/guide/model/types'
import type { Changes, NodeChange } from './changes'

/** A parser: the value rebuilt from known keys only, or an error naming where it went wrong. */
type Parse<T> = (v: unknown, at: string) => T

export class Invalid extends Error {}

const fail = (at: string, what: string): never => {
  throw new Invalid(`${at}: expected ${what}`)
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

const MAX_TEXT = 200_000
export const str: Parse<string> = (v, at) => (typeof v === 'string' && v.length <= MAX_TEXT ? v : fail(at, 'a string'))
export const num: Parse<number> = (v, at) => (typeof v === 'number' && Number.isFinite(v) ? v : fail(at, 'a number'))
export const bool: Parse<boolean> = (v, at) => (typeof v === 'boolean' ? v : fail(at, 'true or false'))
export const oneOf =
  <T extends string>(...values: T[]): Parse<T> =>
  (v, at) =>
    values.find((x) => x === v) ?? fail(at, values.join(' or '))
export const arr =
  <T>(item: Parse<T>, max = 5000): Parse<T[]> =>
  (v, at) =>
    Array.isArray(v) && v.length <= max ? v.map((x, i) => item(x, `${at}[${i}]`)) : fail(at, 'a list')
export const rec =
  <T>(item: Parse<T>): Parse<Record<string, T>> =>
  (v, at) =>
    isObject(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, item(x, `${at}.${k}`)])) : fail(at, 'an object')
export const opt =
  <T>(p: Parse<T>): Parse<T | undefined> =>
  (v, at) =>
    v === undefined ? undefined : p(v, at)
export const nullable =
  <T>(p: Parse<T>): Parse<T | null> =>
  (v, at) =>
    v === null ? null : p(v, at)

type Shape = Record<string, Parse<unknown>>
type Parsed<S extends Shape> = { [K in keyof S as undefined extends ReturnType<S[K]> ? never : K]: ReturnType<S[K]> } & {
  [K in keyof S as undefined extends ReturnType<S[K]> ? K : never]?: Exclude<ReturnType<S[K]>, undefined>
}

/** An object with these keys; others are dropped, and optional ones left out when absent. */
export const obj =
  <S extends Shape>(shape: S): Parse<Parsed<S>> =>
  (v, at) => {
    if (!isObject(v)) return fail(at, 'an object')
    const out: Record<string, unknown> = {}
    for (const [k, p] of Object.entries(shape)) {
      const x = p(v[k], `${at}.${k}`)
      if (x !== undefined) out[k] = x
    }
    // The shape's parsers built every key, so the result has the shape's type.
    return out as Parsed<S>
  }

const other = opt(rec(str))
const raw: Parse<RawElement> = (v, at) => obj({ tag: str, attrs: rec(str), children: arr(raw), text: str })(v, at)

const header = obj({
  type: oneOf('header'), id: str, name: str, rock: str, sun: str, walk: str, access: str, camping: str, steward: opt(str),
  acknowledgement: str, intro: str, history: str, autonumber: str, other,
})
const climb = obj({ type: oneOf('climb', 'problem'), id: str, name: str, number: str, grade: str, extra: str, length: str, stars: str, fa: str, text: str, other })
const text = obj({ type: oneOf('text'), id: str, cls: str, text: str, other })
const point = obj({ x: num, y: num, kind: str })
const image = obj({
  type: oneOf('image'), id: str, src: str, width: num, height: num, noPrint: bool, printLayout: str, legendTitle: str, legendFooter: str,
  legendX: num, legendY: num, legend: arr(str),
  paths: arr(obj({ id: str, points: arr(point), d: str, linkedTo: str, lineStyle: oneOf('solid', 'dashed', 'dotted'), labelText: str, arrow: bool, other })),
  rects: arr(obj({
    id: str, x: num, y: num, width: num, height: num,
    style: oneOf('black_text_on_solid_white', 'white_text_on_solid_black', 'black_text_on_solid_yellow', 'white_outline', 'yellow_outline'),
    arrowDirection: str, text: str, other,
  })),
  otherShapes: arr(raw),
  other,
})
const gps = obj({
  type: oneOf('gps'), id: str,
  points: arr(obj({ pid: str, code: str, description: str, zone: str, easting: str, northing: str, latitude: str, longitude: str, height: str, other })),
  lines: arr(obj({ shape: oneOf('polyline', 'polygon', 'rectangle'), pid: str, description: str, path: str, other })),
  other,
})
const unknown = obj({ type: oneOf('unknown'), raw })

export const guideNode: Parse<GuideNode> = (v, at) => {
  const type = isObject(v) ? v.type : undefined
  switch (type) {
    case 'header':
      return header(v, at)
    case 'climb':
    case 'problem':
      return climb(v, at)
    case 'text':
      return text(v, at)
    case 'image':
      return image(v, at)
    case 'gps':
      return gps(v, at)
    case 'unknown':
      return unknown(v, at)
    default:
      return fail(`${at}.type`, 'a block type')
  }
}

const nodeChange: Parse<NodeChange> = (v, at) => {
  const c = obj({ id: str, before: nullable(guideNode), after: nullable(guideNode) })(v, at)
  if (c.after && c.after.type !== 'unknown' && c.after.id !== c.id) fail(`${at}.after.id`, `the id ${c.id}`)
  return c
}

const changes: Parse<Changes> = obj({
  nodes: arr(nodeChange),
  order: opt(obj({ before: arr(str), after: arr(str) })),
  guideStars: opt(obj({ before: str, after: str })),
})

export type SaveRequest = { guide: string; session: string; changes: Changes; note?: string }

const id = (v: unknown, at: string) => (typeof v === 'string' && /^[\w-]{1,64}$/.test(v) ? v : fail(at, 'an id'))

/** A save request from the browser, checked and rebuilt, or throws `Invalid`. */
export const parseSaveRequest: Parse<SaveRequest> = obj({ guide: id, session: id, changes, note: opt(str) })
