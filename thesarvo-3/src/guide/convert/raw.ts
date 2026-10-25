import { XMLBuilder, XMLParser } from 'fast-xml-parser'
import type { RawElement } from '#/guide/model/types'

const ATTR = '@_'
const TEXT = '#text'
const ATTRS = ':@'

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: ATTR,
  parseAttributeValue: false,
  parseTagValue: false,
  // Kept as written so file names with a leading space survive; toRaw trims everything else.
  trimValues: false,
})

const builder = new XMLBuilder({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: ATTR,
  format: true,
  indentBy: '  ',
  suppressEmptyNode: true,
})

type ParsedNode = Record<string, unknown>

/** Tags that the old downloader left in the files when a browser failed to parse the XML. */
const JUNK_TAGS = new Set(['parsererror'])

function toRaw(node: ParsedNode): RawElement | null {
  const tag = Object.keys(node).find((k) => k !== ATTRS && k !== TEXT)
  if (!tag || JUNK_TAGS.has(tag)) return null
  const attrs: Record<string, string> = {}
  for (const [k, v] of Object.entries((node[ATTRS] ?? {}) as Record<string, string>)) {
    const name = k.slice(ATTR.length)
    attrs[name] = name === 'src' ? String(v) : String(v).trim()
  }
  const kids = node[tag] as ParsedNode[]
  const children: RawElement[] = []
  let text = ''
  for (const kid of kids) {
    if (TEXT in kid) text += String(kid[TEXT]).trim()
    else {
      const child = toRaw(kid)
      if (child) children.push(child)
    }
  }
  return { tag, attrs, children, text }
}

export function parseXml(xml: string): RawElement {
  const root = (parser.parse(xml) as ParsedNode[]).map(toRaw).find((e) => e !== null)
  if (!root) throw new Error('No root element in XML')
  return root
}

function fromRaw(el: RawElement): ParsedNode {
  const kids: ParsedNode[] = el.children.map(fromRaw)
  if (el.text) kids.unshift({ [TEXT]: el.text })
  const node: ParsedNode = { [el.tag]: kids }
  const entries = Object.entries(el.attrs)
  if (entries.length) node[ATTRS] = Object.fromEntries(entries.map(([k, v]) => [ATTR + k, v]))
  return node
}

/** Pretty-printed, deterministic XML with a trailing newline, to keep git diffs small. */
export function buildXml(root: RawElement): string {
  return `${String(builder.build([fromRaw(root)])).trim()}\n`
}
