import type { Other } from '#/guide/model/types'

/**
 * Credit for material taken from theCrag (https://www.thecrag.com), which is CC BY-NC-SA while the rest of the site is CC BY-SA.
 * `other.thecragContent` lists what on a node came from theCrag and is copyright material ("text", "intro", "topo"...);
 * facts such as grades and lengths are not listed and get no credit. `other.thecrag` is the theCrag node, `other.thecragArea` the area of a topo.
 */
export const THECRAG_LICENCE_URL = 'https://creativecommons.org/licenses/by-nc-sa/3.0/au/'

export const thecragUrl = (nodeId: string) => `https://www.thecrag.com/node/${nodeId}`

/** What on the node came from theCrag. */
export const thecragContent = (other?: Other): string[] =>
  (other?.thecragContent ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

/** The node without the mark for `key` (or all marks), for an editor who has replaced the material with their own. */
export function withoutMark(other: Other | undefined, key?: string): Other {
  const rest = Object.fromEntries(Object.entries(other ?? {}).filter(([k]) => k !== 'thecragContent'))
  const left = key ? thecragContent(other).filter((k) => k !== key) : []
  return left.length ? { ...rest, thecragContent: left.join(',') } : rest
}

/** "theCrag" linking to the node on theCrag, titled with what it is and the licence. */
export function CragLink({ node, what }: { node: string; what: string }) {
  return (
    <a href={thecragUrl(node)} target="_blank" rel="noreferrer" title={`${what} by theCrag contributors, CC BY-NC-SA 3.0`} className="underline hover:text-navy">
      theCrag
    </a>
  )
}

/** Whether `part` of the node came from theCrag and so needs its credit. */
export const credited = (other: Other | undefined, part: string) => Boolean(other?.thecrag) && thecragContent(other).includes(part)

/** The credit for one kind of content on a node, or nothing when the node has none from theCrag. */
export function Credit({ other, part, what }: { other?: Other; part: string; what: string }) {
  return credited(other, part) ? <CragLink node={other?.thecrag ?? ''} what={what} /> : null
}

/** The credit after running text (a header section, a text block): small and grey, as the first ascent line. */
export function InlineCredit(props: { other?: Other; part: string; what: string }) {
  if (!credited(props.other, props.part)) return null
  return <span className="ml-1 text-[11px] italic text-[#808080]">· From: <Credit {...props} /></span>
}

/** Under a topo drawn by theCrag contributors, linked to the area it is of. */
export function TopoCredit({ other }: { other?: Other }) {
  if (!other?.thecragArea || !thecragContent(other).includes('topo')) return null
  return (
    <p className="mt-1 text-[11px] italic text-[#808080]">
      Topo: theCrag contributors, <a href={THECRAG_LICENCE_URL} target="_blank" rel="noreferrer" className="underline hover:text-navy">CC BY-NC-SA 3.0</a>, <CragLink node={other.thecragArea} what="Topo" />
    </p>
  )
}
