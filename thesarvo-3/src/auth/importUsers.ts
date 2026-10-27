import { createHmac } from 'node:crypto'
import { parseConfluenceHash, toPhc } from './confluenceHash'

/** One row of `scripts/export-users.sh`. */
export type ConfluenceUser = { username: string; email: string; displayName: string; credential: string; lastLogin: string }

const COLUMNS = ['username', 'email', 'displayName', 'credential', 'lastLogin'] as const

export function parseUsersTsv(tsv: string): ConfluenceUser[] {
  const [, ...rows] = tsv.trim().split('\n')
  return rows.map((row) => {
    const cells = row.split('\t')
    return Object.fromEntries(COLUMNS.map((c, i) => [c, cells[i] === 'NULL' ? '' : (cells[i] ?? '')])) as ConfluenceUser
  })
}

/**
 * Every provider keys users by email, but about 50 Confluence emails have several accounts. Keeps the one
 * signed in to most recently (ISO-like dates sort as text) and drops accounts with no email.
 */
export function onePerEmail(users: ConfluenceUser[]): ConfluenceUser[] {
  const best = new Map<string, ConfluenceUser>()
  for (const u of users) {
    const email = u.email.trim().toLowerCase()
    if (!email.includes('@')) continue
    const seen = best.get(email)
    if (!seen || u.lastLogin > seen.lastLogin) best.set(email, { ...u, email })
  }
  return [...best.values()]
}

/** The PHC string for a user's password, or undefined for the legacy unsalted ones (they reset by email). */
function phc(u: ConfluenceUser) {
  const hash = parseConfluenceHash(u.credential)
  return hash?.kind === 'pbkdf2' ? toPhc(hash) : undefined
}

/** Auth0 bulk import (`POST /api/v2/jobs/users-imports`); it re-hashes to bcrypt on first sign-in. */
export const toAuth0 = (u: ConfluenceUser) => {
  const value = phc(u)
  return {
    email: u.email,
    email_verified: true,
    name: u.displayName || u.username,
    app_metadata: { confluenceUsername: u.username },
    ...(value && { custom_password_hash: { algorithm: 'pbkdf2', hash: { value, encoding: 'utf8' } } }),
  }
}

/** A WorkOS `POST /user_management/users` body. */
export const toWorkos = (u: ConfluenceUser) => {
  const value = phc(u)
  return {
    email: u.email,
    email_verified: true,
    external_id: u.username,
    ...(value && { password_hash_type: 'pbkdf2', password_hash: value }),
  }
}

/** The Cognito migration table's key: an HMAC of the email, so the table holds no emails. */
export const cognitoKey = (pepper: string, email: string) => createHmac('sha256', pepper).update(email.trim().toLowerCase()).digest('base64url')

/** What the migrate-user Lambda knows of an old account: its Confluence credential and the name it went by. */
export type CognitoEntry = { credential: string; name: string }

/** Tables built before names came over hold just the credential. */
export type CognitoTable = Record<string, string | CognitoEntry>

export const cognitoEntry = (table: CognitoTable, pepper: string, email: string): CognitoEntry | undefined => {
  const e = table[cognitoKey(pepper, email)]
  return typeof e === 'string' ? { credential: e, name: '' } : e
}

/** Email HMAC to credential and name, for the Cognito migrate-user Lambda. Legacy hashes are left out. */
export const toCognitoTable = (users: ConfluenceUser[], pepper: string): Record<string, CognitoEntry> =>
  Object.fromEntries(users.filter((u) => phc(u)).map((u) => [cognitoKey(pepper, u.email), { credential: u.credential, name: u.displayName || u.username }]))
