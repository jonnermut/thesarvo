import { createPublicKey, createVerify } from 'node:crypto'
import type { JsonWebKey } from 'node:crypto'
import { COGNITO } from './config'

/** Who made a request, from a verified Cognito ID token. The email and name become the git commit author. */
export type Editor = { sub: string; email: string; name: string }

type Jwk = JsonWebKey & { kid: string }
type Options = { issuer: string; clientId: string; keys: () => Promise<Jwk[]>; now?: () => number }

const part = (s: string) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8')) as Record<string, unknown>

/**
 * Checks an ID token's RS256 signature against the pool's keys, then its issuer, audience, use and
 * expiry. Throws on anything wrong. Hand-written: a JWT check is a few lines, and Cognito signs only RS256.
 */
export async function verifyIdToken(jwt: string, o: Options): Promise<Editor> {
  const [h, p, sig] = jwt.split('.')
  if (!sig) throw new Error('Malformed token')
  const header = part(h)
  const key = (await o.keys()).find((k) => k.kid === header.kid)
  if (header.alg !== 'RS256' || !key) throw new Error('Unknown signing key')
  const valid = createVerify('RSA-SHA256').update(`${h}.${p}`).verify(createPublicKey({ key, format: 'jwk' }), Buffer.from(sig, 'base64url'))
  if (!valid) throw new Error('Bad signature')
  const c = part(p)
  if (c.iss !== o.issuer || c.aud !== o.clientId || c.token_use !== 'id') throw new Error('Token is not for this site')
  if (typeof c.exp !== 'number' || c.exp * 1000 <= (o.now ?? Date.now)()) throw new Error('Token expired')
  return { sub: String(c.sub), email: String(c.email ?? ''), name: String(c.name ?? c.email ?? '') }
}

let jwks: Promise<Jwk[]> | undefined
/** The pool's public keys, fetched once per server instance. */
const cognitoKeys = () =>
  (jwks ??= fetch(`${COGNITO.issuer}/.well-known/jwks.json`)
    .then((r) => r.json() as Promise<{ keys: Jwk[] }>)
    .then((j) => j.keys)
    .catch((e: unknown) => {
      jwks = undefined
      throw e
    }))

/** The signed-in editor behind a request (`Authorization: Bearer <ID token>`), or a 401 response to return. */
export async function requireEditor(request: Request): Promise<Editor | Response> {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1]
  if (!token) return Response.json({ error: 'Please sign in' }, { status: 401 })
  try {
    return await verifyIdToken(token, { issuer: COGNITO.issuer, clientId: COGNITO.clientId, keys: cognitoKeys })
  } catch {
    return Response.json({ error: 'Your sign-in has expired. Please sign in again.' }, { status: 401 })
  }
}
