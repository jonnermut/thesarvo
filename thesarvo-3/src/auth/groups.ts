/**
 * Who is in which group (role), as `private/groups.json` in the content bucket: group name to the lowercased emails in
 * it. People are listed by email, not Cognito user, because most of them have not signed in to the new site yet; the
 * sign-in trigger (cognitoPreToken.ts) adds a user's groups to their token by their verified email. Groups are the
 * roles `admins` (the admin role) and, for page restrictions, `cct-members` and others (see src/guide/content/access.ts).
 */
export type GroupTable = Record<string, string[]>

export const GROUPS_KEY = 'private/groups.json'

/** Reads the file's text; throws on anything that is not a map of name to a list of emails, so a bad edit never silently empties a group. */
export function parseGroups(text: string | null): GroupTable {
  if (text === null) return {}
  const raw: unknown = JSON.parse(text)
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('groups.json: expected an object')
  const out: GroupTable = {}
  for (const [name, list] of Object.entries(raw)) {
    const emails: unknown = list
    if (!Array.isArray(emails) || !emails.every((e) => typeof e === 'string' && e.includes('@'))) throw new Error(`groups.json: ${name}: expected a list of emails`)
    out[name] = emails as string[]
  }
  return out
}

/** The groups this email is in. */
export const groupsFor = (table: GroupTable, email: string) => Object.keys(table).filter((g) => table[g]?.includes(email.trim().toLowerCase()))

/**
 * The table with `emails` in `group`: added to those already there, or (`replace`) instead of them. Sorted, so the
 * file diffs well. Reports how many were new, already there, and (when replacing) dropped.
 */
export function withMembers(table: GroupTable, group: string, emails: readonly string[], replace = false) {
  const wanted = [...new Set(emails.map((e) => e.trim().toLowerCase()))]
  const before = new Set(table[group] ?? [])
  const after = replace ? wanted : [...new Set([...before, ...wanted])]
  return {
    table: { ...table, [group]: after.sort() },
    added: wanted.filter((e) => !before.has(e)).length,
    already: wanted.filter((e) => before.has(e)).length,
    dropped: replace ? [...before].filter((e) => !wanted.includes(e)).length : 0,
  }
}

/** Confluence group to the role that replaces it. `confluence-administrators` is left out on purpose: admins are made in Cognito itself, by hand. */
export const CONFLUENCE_GROUPS: Record<string, string> = { CCTMembers: 'cct-members', MountainGuideEditors: 'editors' }

/** `group_name<TAB>email` rows from the live Confluence (header row first) as `{ role: emails }`, for the groups in `CONFLUENCE_GROUPS`; other groups are ignored. */
export function parseConfluenceGroups(tsv: string): GroupTable {
  const out: GroupTable = {}
  for (const line of tsv.trim().split('\n').slice(1)) {
    const [group = '', email = ''] = line.split('\t').map((c) => c.trim())
    const role = CONFLUENCE_GROUPS[group]
    if (role && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) (out[role] ??= []).push(email.toLowerCase())
  }
  for (const role of Object.keys(out)) out[role] = [...new Set(out[role])].sort()
  return out
}
