import { guideFromXml } from '#/guide/convert/xml'
import type { Guide } from '#/guide/model/types'
import { diffGuides, ensureIds, isEmpty } from '#/guide/save/changes'
import { updateHistory } from '#/guide/save/history'
import type { HistoryEntry } from '#/guide/save/history'

/** One stored version of a Confluence page, as the database holds it: `userKey` is the modifier's key (null when unknown), `body` the page's storage body. */
export type Version = { id: string; version: number; at: string; userKey: string | null; comment: string; body: string }
export type Person = { sub: string; name: string }

/** Prefix of the session ids written here, so a re-run replaces what it wrote and leaves the site's own entries alone. */
export const IMPORTED = 'confluence-'

/** The text `mysql -B` writes for a value: its escapes (`\n`, `\t`, `\\`, `\0`) turned back into the characters. */
export const unescapeBatch = (s: string) => s.replace(/\\([nt0\\])/g, (_, c: string) => ({ n: '\n', t: '\t', 0: '\0', '\\': '\\' })[c] ?? c)

/** The guide XML inside a page's `guide` macro, or null for a page body that has none. */
export function guideXmlOf(body: string): string | null {
  const m = /<ac:plain-text-body><!\[CDATA\[([\s\S]*?)\]\]><\/ac:plain-text-body>/.exec(body)
  // CDATA ends are written as `]]]]><![CDATA[>` when the text holds `]]>`.
  if (m) return m[1].replaceAll(']]]]><![CDATA[>', ']]>')
  // Before 2012 the page was the wiki markup `{guide}<?xml ...?><guide>...</guide>{guide}`, then maybe an `{attachments}` macro.
  const old = /^\{guide\}\s*(?:<\?xml[^>]*\?>\s*)?(<guide[\s\S]*<\/guide>)\s*(?:\{guide\}[\s\S]*)?$/.exec(body)
  return old ? old[1] : null
}

/** The guide as of a version, with every block given an id; null when the body is not readable as a guide. */
export function parseVersion(id: string, body: string): Guide | null {
  const xml = guideXmlOf(body)
  if (!xml) return null
  try {
    return ensureIds(guideFromXml(id, xml))
  } catch {
    return null
  }
}

const unknown: Person = { sub: `${IMPORTED}unknown`, name: 'Unknown' }
/** Who a squashed stretch is credited to: its note names the people. */
const earlier: Person = { sub: `${IMPORTED}earlier`, name: 'Earlier editors' }
const GENERIC = /^(guide edited|)$/i
const day = (at: string) => at.slice(0, 10)
/** MySQL's `2020-01-02 10:00:00` (UTC on the Confluence server) as an ISO time. */
const iso = (at: string) => `${at.replace(' ', 'T')}.000Z`

/** "A, B and 3 others". */
function names(people: Person[]) {
  const unique = [...new Set(people.map((p) => p.name))]
  return unique.length <= 4 ? unique.join(', ') : `${unique.slice(0, 3).join(', ')} and ${unique.length - 3} others`
}

/**
 * The history entries for a guide's Confluence versions (any order): the last `keep` versions as one entry each, and
 * everything before them as one entry for the whole stretch (only the first version and the kept ones need a body) (the net change from the first version to where the kept ones
 * begin). Versions that do not read as a guide make an entry with a note and no changes. Newest last.
 */
export function historyFromVersions(id: string, versions: Version[], who: (userKey: string | null) => Person | undefined, keep: number): HistoryEntry[] {
  // By date: a few pages (re-created in Confluence) have a current version numbered 1.
  const sorted = versions.toSorted((a, b) => a.at.localeCompare(b.at) || a.version - b.version)
  const person = (v: Version) => (v.userKey && who(v.userKey)) || unknown
  // `keep` entries need `keep` changes, so one version before them as the starting point.
  const first = Math.max(0, sorted.length - keep - 1)
  // Only the first version and the kept ones are read, so the others may come without a body.
  const parsed = sorted.map((v, i) => ({ v, guide: i === 0 || i >= first ? parseVersion(id, v.body) : null }))
  const out: HistoryEntry[] = []
  let base: Guide | null = null
  const entry = (v: Version, guide: Guide, before: Guide, note?: string) => {
    const made = updateHistory([], { session: `${IMPORTED}${v.id}`, user: person(v), at: iso(v.at), changes: diffGuides(before, guide), guide, ...(note && { note }) })
    if (made[0]) made[0].saves = 1
    return made
  }
  let legacy: HistoryEntry | undefined
  /** Edits made before the guide existed in the form this site reads (Confluence's old HTML pages) are one entry, since there is nothing to show of them. */
  const legacyEdit = (v: Version, edits: number, start = v.at) => {
    if (!legacy) {
      legacy = { session: `${IMPORTED}${v.id}-old`, user: earlier, start: iso(start), end: iso(v.at), saves: 0, nodes: {}, description: '', note: 'Imported from Confluence, which kept these in an older page format that this site cannot show.' }
      out.push(legacy)
    }
    legacy.saves += edits
    legacy.end = iso(v.at)
    legacy.description = `${legacy.saves} earlier edits (${day(legacy.start)} to ${day(v.at)}) in the old page format`
  }
  parsed.forEach(({ v, guide }, i) => {
    if (i < first) {
      base ??= guide
      return
    }
    if (i === first) {
      if (first > 0 && base && guide && !isEmpty(diffGuides(base, guide))) {
        // The stretch before the kept versions, as the net change from the first version to this one.
        const older = parsed.slice(0, first + 1)
        const first0 = older[0].v
        const changes = diffGuides(base, guide)
        const made = updateHistory([], { session: `${IMPORTED}${first0.id}-${v.id}`, user: person(v), at: iso(v.at), changes, guide })
        if (made[0]) {
          made[0].start = iso(first0.at)
          made[0].saves = older.length - 1
          made[0].description = `${older.length - 1} earlier edits (${day(first0.at)} to ${day(v.at)}): ${made[0].description}`
          made[0].user = earlier
          made[0].note = `Imported from Confluence. By ${names(older.map((o) => person(o.v)))}.`
          out.push(made[0])
        }
      } else if (first > 0 && !(base && guide)) legacyEdit(v, first, parsed[0].v.at)
      base = guide ?? base
      return
    }
    const comment = GENERIC.test(v.comment.trim()) ? '' : v.comment.trim()
    if (!guide) {
      if (!base) return legacyEdit(v, 1)
      out.push({ session: `${IMPORTED}${v.id}`, user: person(v), start: iso(v.at), end: iso(v.at), saves: 1, nodes: {}, description: 'edited the guide (this version could not be read)', note: ['Imported from Confluence', comment].filter(Boolean).join(': ') })
      return
    }
    if (base) out.push(...entry(v, guide, base, ['Imported from Confluence', comment].filter(Boolean).join(': ')))
    base = guide
  })
  return out
}
