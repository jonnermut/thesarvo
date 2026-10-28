/** A person to put in a group: a lowercased email and, when the pasted text names them, a name. */
export type Member = { email: string; name?: string }

export type ParsedMembers = { members: Member[]; duplicates: number; skipped: string[] }

const EMAIL = /[^\s<>"'(),;:|\\[\]{}]+@[^\s<>"'(),;:|\\[\]{}]+/g
const VALID = /^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i

/** Splits CSV or TSV-ish text into rows of cells, honouring double quotes (a quoted cell may hold commas, tabs and newlines). */
function rows(text: string): string[][] {
  const out: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const endCell = () => (row.push(cell.trim()), (cell = ''))
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (cell += '"', i++)
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"' && cell === '') quoted = true
    else if (c === ',' || c === '\t' || c === ';' || c === '|') endCell()
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      endCell()
      out.push(row)
      row = []
    } else cell += c
  }
  endCell()
  out.push(row)
  return out.filter((r) => r.some(Boolean))
}

const clean = (raw: string) => raw.replace(/^mailto:/i, '').replace(/[.,;:!?]+$/, '').toLowerCase()

/**
 * Finds every email address in pasted text, however it is delimited (commas, tabs, semicolons, spaces, lines, `Name <a@b.com>`,
 * `mailto:` links, a whole CSV export). A header row naming first and last name columns (or one name column) supplies names.
 * Addresses are lowercased and deduplicated (the first name seen wins); anything that looks like an address but is not valid is
 * reported in `skipped` so the pasting admin can see what was ignored.
 */
export function parseMembers(text: string): ParsedMembers {
  const found = new Map<string, Member>()
  const skipped: string[] = []
  let duplicates = 0
  const add = (raw: string, name?: string) => {
    const email = clean(raw)
    if (!VALID.test(email)) return skipped.push(raw)
    const known = found.get(email)
    if (known) {
      duplicates++
      if (!known.name && name) known.name = name
    } else found.set(email, name ? { email, name } : { email })
  }
  const table = rows(text)
  const header = table[0]?.map((h) => h.toLowerCase().replace(/[^a-z]/g, '')) ?? []
  const first = header.findIndex((h) => h === 'firstname' || h === 'givenname')
  const last = header.findIndex((h) => h === 'lastname' || h === 'surname' || h === 'familyname')
  const single = header.findIndex((h) => h === 'name' || h === 'fullname' || h === 'displayname')
  const hasHeader = table[0] !== undefined && !table[0].some((c) => c.includes('@')) && (first >= 0 || last >= 0 || single >= 0 || header.some((h) => h.includes('email')))
  // `Name <a@b.com>` or `"Last, First" <a@b.com>`, read from the raw text since the name may hold the delimiter.
  const angled = new Map<string, string>()
  for (const m of hasHeader ? [] : text.matchAll(/(?:"([^"]+)"|([^<>",;\n]+?))\s*<([^<>\s]+@[^<>\s]+)>/g)) angled.set(clean(m[3] ?? ''), (m[1] ?? m[2] ?? '').trim())
  for (const row of hasHeader ? table.slice(1) : table) {
    const named = hasHeader ? [first >= 0 ? row[first] : '', last >= 0 ? row[last] : '', first < 0 && last < 0 && single >= 0 ? row[single] : ''].filter(Boolean).join(' ') : ''
    const matches = row.flatMap((cell) => cell.match(EMAIL) ?? [])
    for (const m of matches) add(m, named || angled.get(clean(m)))
  }
  return { members: [...found.values()], duplicates, skipped }
}
