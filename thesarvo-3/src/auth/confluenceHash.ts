import { createHash, pbkdf2Sync, timingSafeEqual } from 'node:crypto'

/**
 * Confluence's two password formats, as found in `cwd_user.credential`:
 * - `{PKCS5S2}` + base64(16-byte salt + 32-byte key): PBKDF2-HMAC-SHA1, 10,000 iterations (Atlassian's
 *   DefaultPasswordEncoder). Every account since 2012.
 * - base64(SHA-512(password)), unsalted: Atlassian's legacy encoder, 384 accounts from 2011, none signed in
 *   within five years. Too weak to carry over; those users reset by email.
 */
export type ConfluenceHash =
  | { kind: 'pbkdf2'; iterations: number; salt: Buffer; key: Buffer }
  | { kind: 'sha512'; digest: Buffer }

const PKCS5S2 = '{PKCS5S2}'
const ITERATIONS = 10_000

export function parseConfluenceHash(credential: string): ConfluenceHash | null {
  if (credential.startsWith(PKCS5S2)) {
    const raw = Buffer.from(credential.slice(PKCS5S2.length), 'base64')
    return raw.length === 48 ? { kind: 'pbkdf2', iterations: ITERATIONS, salt: raw.subarray(0, 16), key: raw.subarray(16) } : null
  }
  const digest = Buffer.from(credential, 'base64')
  return digest.length === 64 ? { kind: 'sha512', digest } : null
}

export function verifyConfluencePassword(credential: string, password: string): boolean {
  const hash = parseConfluenceHash(credential)
  if (!hash) return false
  const actual =
    hash.kind === 'pbkdf2'
      ? pbkdf2Sync(password, hash.salt, hash.iterations, hash.key.length, 'sha1')
      : createHash('sha512').update(password, 'utf8').digest()
  return timingSafeEqual(actual, hash.kind === 'pbkdf2' ? hash.key : hash.digest)
}

const b64 = (b: Buffer) => b.toString('base64').replace(/=+$/, '')

/** The PHC string WorkOS and Auth0 import for PBKDF2 hashes: `$pbkdf2-sha1$i=10000,l=32$<salt>$<key>`. */
export const toPhc = (hash: Extract<ConfluenceHash, { kind: 'pbkdf2' }>) =>
  `$pbkdf2-sha1$i=${hash.iterations},l=${hash.key.length}$${b64(hash.salt)}$${b64(hash.key)}`

/** Builds a Confluence-style credential, for tests and for checking the converters round-trip. */
export function confluenceCredential(password: string, salt: Buffer): string {
  const key = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha1')
  return PKCS5S2 + Buffer.concat([salt, key]).toString('base64')
}
