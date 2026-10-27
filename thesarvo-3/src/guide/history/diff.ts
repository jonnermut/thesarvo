import type { Gps, GuideNode, ImageTopo } from '#/guide/model/types'
import { headerFields } from '#/guide/save/history'

/** A run of words both versions share, or that only the new (add) or old (del) one has. */
export type Piece = { op: 'same' | 'add' | 'del'; text: string }

/** Above this many cells the word table is too big for a phone: the change shows as all old, then all new. */
const MAX_CELLS = 2_000_000

/** Word by word: the longest common run of words kept, the rest marked added or deleted. */
export function wordDiff(before: string, after: string): Piece[] {
  const a = before.match(/\s+|\S+/g) ?? []
  const b = after.match(/\s+|\S+/g) ?? []
  // Edits are mostly local: what both start and end with needs no table.
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let end = 0
  while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++
  const x = a.slice(start, a.length - end)
  const y = b.slice(start, b.length - end)
  const ops: Piece[] = []
  if ((x.length + 1) * (y.length + 1) > MAX_CELLS) ops.push(...x.map((text) => ({ op: 'del' as const, text })), ...y.map((text) => ({ op: 'add' as const, text })))
  else {
    const w = y.length + 1
    const len = new Int32Array((x.length + 1) * w)
    for (let i = x.length - 1; i >= 0; i--) for (let j = y.length - 1; j >= 0; j--) len[i * w + j] = x[i] === y[j] ? len[(i + 1) * w + j + 1] + 1 : Math.max(len[(i + 1) * w + j], len[i * w + j + 1])
    for (let i = 0, j = 0; i < x.length || j < y.length; ) {
      if (i < x.length && j < y.length && x[i] === y[j]) {
        ops.push({ op: 'same', text: x[i++] })
        j++
      } else if (i < x.length && (j === y.length || len[(i + 1) * w + j] >= len[i * w + j + 1])) ops.push({ op: 'del', text: x[i++] })
      else ops.push({ op: 'add', text: y[j++] })
    }
  }
  // Read as phrases: a change runs on over the spaces between changed words, its old words first, then its new ones.
  const pieces: Piece[] = []
  const push = (op: Piece['op'], text: string) => {
    const last = pieces.at(-1)
    if (last?.op === op) last.text += text
    else if (text) pieces.push({ op, text })
  }
  push('same', a.slice(0, start).join(''))
  for (let k = 0; k < ops.length; ) {
    if (ops[k].op === 'same') {
      push('same', ops[k++].text)
      continue
    }
    let del = ''
    let add = ''
    for (; k < ops.length; k++) {
      const { op, text } = ops[k]
      if (op === 'same' && !(/^\s+$/.test(text) && ops[k + 1] && ops[k + 1].op !== 'same')) break
      if (op !== 'add') del += text
      if (op !== 'del') add += text
    }
    push('del', del)
    push('add', add)
  }
  push('same', a.slice(a.length - end).join(''))
  return pieces
}

/** Guide text as a reader sees it: line breaks kept, tags dropped, the usual entities decoded. */
export function readable(html: string): string {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }
  return html
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(\w+|#39);/g, (m, name: string) => entities[name] ?? m)
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** One field of a block that differs: `long` ones (prose) show word by word, short ones as old → new. */
export type FieldDiff = { field: string; before: string; after: string; long: boolean }

type Field = { field: string; value: string; long?: true }

const climbFields = (n: Extract<GuideNode, { type: 'climb' | 'problem' }>): Field[] => [
  { field: 'Number', value: n.number },
  { field: 'Name', value: readable(n.name) },
  { field: 'Grade', value: n.grade },
  { field: 'Length', value: n.length },
  { field: 'Stars', value: n.stars },
  { field: 'Extra', value: readable(n.extra) },
  { field: 'First ascent', value: readable(n.fa), long: true },
  { field: 'Description', value: readable(n.text), long: true },
]

const capital = (words: string) => words.replace(/^the /, '').replace(/^./, (c) => c.toUpperCase())

const gpsText = (g: Gps) =>
  [
    ...g.points.map((p) => [p.code, p.description, p.zone, p.easting, p.northing, p.latitude, p.longitude, p.height && `${p.height} m`].filter(Boolean).join(' ')),
    ...g.lines.map((l) => `${l.shape} ${l.description} (${l.path.trim().split(/\s+/).filter(Boolean).length} points)`),
  ].join('\n')

const topoFields = (n: ImageTopo): Field[] => [
  { field: 'Image', value: n.src },
  { field: 'Lines', value: n.paths.length ? String(n.paths.length) : '' },
  { field: 'Labels', value: n.rects.map((r) => readable(r.text)).filter(Boolean).join(', ') },
  { field: 'Legend title', value: readable(n.legendTitle) },
  { field: 'Legend footer', value: readable(n.legendFooter), long: true },
  { field: 'Climbs in the legend', value: n.legend.length ? String(n.legend.length) : '' },
  // Moving a point or a label: worth saying even though there is no word for it.
  { field: 'Drawing', value: JSON.stringify([n.paths.map((p) => [p.d, p.linkedTo, p.lineStyle, p.labelText, p.arrow]), n.rects, n.legendX, n.legendY, n.width, n.height]) },
]

function fields(n: GuideNode): Field[] {
  switch (n.type) {
    case 'climb':
    case 'problem':
      return climbFields(n)
    case 'header':
      return headerFields.map(([k, words]) => {
        const v = n[k]
        const value = typeof v !== 'string' ? '' : k === 'autonumber' ? (v === 'true' ? 'on' : '') : readable(v)
        return { field: capital(words), value, long: true }
      })
    case 'text':
      return [
        { field: 'Style', value: n.cls.startsWith('heading') ? `Heading ${n.cls.slice(7) || ''}`.trim() : n.cls === 'text' ? '' : n.cls },
        { field: 'Text', value: readable(n.text), long: true },
      ]
    case 'image':
      return topoFields(n)
    case 'gps':
      return [{ field: 'Points and lines', value: gpsText(n), long: true }]
    case 'unknown':
      return [{ field: 'Block the site cannot show yet', value: n.raw.tag }]
  }
}

/** The fields that differ between a block's two versions; one side null for a block added or deleted. */
export function fieldDiffs(before: GuideNode | null, after: GuideNode | null): FieldDiff[] {
  const was = new Map(before ? fields(before).map((f) => [f.field, f]) : [])
  const now = after ? fields(after) : []
  const names = [...new Set([...now.map((f) => f.field), ...was.keys()])]
  const nowByName = new Map(now.map((f) => [f.field, f]))
  return names.flatMap((field) => {
    const b = was.get(field)
    const a = nowByName.get(field)
    const [x, y] = [b?.value ?? '', a?.value ?? '']
    if (x === y) return []
    // The drawing's raw data means nothing to read: just say it changed.
    if (field === 'Drawing') return before && after ? [{ field, before: '', after: 'moved or restyled', long: false }] : []
    return [{ field, before: x, after: y, long: !!(a?.long ?? b?.long) }]
  })
}
