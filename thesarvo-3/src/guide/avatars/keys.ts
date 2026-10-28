/** `avatars.json`: a person's id (a Cognito sub, `confluence:<username>` or `email:<key>`) to the file of their picture in `g-data/avatars/`. */
export type AvatarMap = Record<string, string>

/** Confluence's built-in pictures and the placeholder files it stores for people who never chose one. */
export const isBuiltInPicture = (name: string) => !name || name === 'NULL' || name.startsWith('/images/') || name === 'user-avatar'

/** A short, stable key for an email address, so a signed-in person finds their picture without the address being in a public file. */
export async function emailKey(email: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email.trim().toLowerCase()))
  return `email:${[...new Uint8Array(bytes).slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('')}`
}

/** The picture file for the first of `ids` that has one. */
export const avatarFile = (map: AvatarMap, ids: readonly string[]) => ids.map((id) => map[id]).find(Boolean)

/** Parses `avatars.json`, dropping anything that is not a plain file name. */
export function parseAvatars(json: unknown): AvatarMap {
  if (typeof json !== 'object' || json === null) return {}
  return Object.fromEntries(Object.entries(json).filter((e): e is [string, string] => typeof e[1] === 'string' && /^[\w.-]+$/.test(e[1])))
}
