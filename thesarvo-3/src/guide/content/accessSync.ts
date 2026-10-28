import type { AccessMap } from './access'

/** One row of a page's Confluence view restriction: a group, or (group null) a named user. */
export type Restriction = { id: string; group: string | null }

/** Confluence group to the Cognito group (role) that replaces it. Anything else is reported, never guessed. */
export const GROUP_MAP: Record<string, string> = { CCTMembers: 'cct-members', 'confluence-administrators': 'admins', MountainGuideEditors: 'editors' }

/**
 * `access.json` from view restrictions: a page restricted to groups gets those groups (named people are added to
 * `cct-members` by scripts/import-members.ts instead); a page restricted to named users only is `draft`, which means
 * admins only, so it is kept private until the owner decides. Restrictions on pages that are not in the content
 * (`known`) are skipped and returned as `missing`.
 */
export function accessFromRestrictions(rows: Restriction[], known: ReadonlySet<string>) {
  const access: AccessMap = {}
  const unmapped = new Set<string>()
  const missing = new Set<string>()
  for (const { id, group } of rows) {
    if (!known.has(id)) {
      missing.add(id)
      continue
    }
    const entry = (access[id] ??= {})
    if (group === null) continue
    const mapped = GROUP_MAP[group]
    if (!mapped) unmapped.add(group)
    else if (!(entry.groups ??= []).includes(mapped)) entry.groups.push(mapped)
  }
  for (const entry of Object.values(access)) {
    if (!entry.groups?.length) (delete entry.groups, (entry.draft = true))
    else entry.groups.sort()
  }
  return { access, unmapped: [...unmapped].sort(), missing: [...missing].sort() }
}
