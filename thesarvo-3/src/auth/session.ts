import { useSyncExternalStore } from 'react'
import { COGNITO } from './config'
import { CALLBACK_PATH } from './paths'

/**
 * Sign-in in the browser alone, so it works on the static site: Cognito's managed login with PKCE,
 * tokens kept in localStorage and refreshed straight from Cognito's token endpoint.
 */

/**
 * `hasPassword` is false for a Google, Apple or Facebook sign-in: there is no password to change. `admin` (the Cognito
 * group `admins`) only shows admin actions: the API checks the token itself.
 */
export type User = { sub: string; email: string; name: string; hasPassword: boolean; admin: boolean }
/** `accessToken` is missing from sessions started before it was kept. */
type Tokens = { idToken: string; accessToken?: string; refreshToken: string; expiresAt: number }

const KEY = 'thesarvo.auth'
const PENDING = 'thesarvo.auth.pending'
/** Refresh this long before the ID token expires. */
const MARGIN_MS = 60_000

const storage = {
  get: (k: string, s: Storage = localStorage) => {
    try {
      return s.getItem(k)
    } catch {
      return null
    }
  },
  set: (k: string, v: string | null, s: Storage = localStorage) => {
    try {
      if (v === null) s.removeItem(k)
      else s.setItem(k, v)
    } catch {
      /* storage blocked: the session lasts until reload */
    }
  },
}

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

const readTokens = (): Tokens | null => {
  const raw = storage.get(KEY)
  return raw ? (JSON.parse(raw) as Tokens) : null
}
const writeTokens = (t: Tokens | null) => {
  storage.set(KEY, t && JSON.stringify(t))
  notify()
}

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const random = () => b64url(crypto.getRandomValues(new Uint8Array(32)))

/** The claims of a JWT, unverified: fine for showing who is signed in; the server verifies before trusting. */
export const claims = (jwt: string) =>
  JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)))) as Record<string, unknown>

let cached: { raw: string | null; user: User | null } = { raw: null, user: null }
/** Who is signed in, from the stored ID token. Stable between changes, as useSyncExternalStore needs. */
function currentUser(): User | null {
  const raw = storage.get(KEY)
  if (raw !== cached.raw) {
    const t = raw ? (JSON.parse(raw) as Tokens) : null
    const c = t && claims(t.idToken)
    cached = {
      raw,
      user: c ? { sub: String(c.sub), email: String(c.email ?? ''), name: String(c.name ?? c.email ?? ''), hasPassword: !c.identities, admin: Array.isArray(c['cognito:groups']) && c['cognito:groups'].includes('admins') } : null,
    }
  }
  return cached.user
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => e.key === KEY && listener() // other tabs
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

/** The signed-in user; null while rendering on the server and hydrating, so the HTML matches. */
export const useUser = () => useSyncExternalStore(subscribe, currentUser, () => null)

const redirectUri = () => location.origin + CALLBACK_PATH

/** Sends the browser to Cognito's login page; it comes back to the callback route, then to `returnTo`. */
export const signIn = (returnTo = location.pathname + location.search) => toCognito('/oauth2/authorize', returnTo)

/** The same, starting on Cognito's sign-up form: the new user comes back signed in. */
export const signUp = (returnTo = location.pathname + location.search) => toCognito('/signup', returnTo)

async function toCognito(path: string, returnTo: string) {
  const verifier = random()
  const state = random()
  storage.set(PENDING, JSON.stringify({ verifier, state, returnTo }), sessionStorage)
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))))
  const q = new URLSearchParams({
    client_id: COGNITO.clientId,
    response_type: 'code',
    // The last scope lets the access token change the user's own password.
    scope: 'openid email profile aws.cognito.signin.user.admin',
    redirect_uri: redirectUri(),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  location.assign(`${COGNITO.domain}${path}?${q}`)
}

async function token(params: Record<string, string>) {
  const res = await fetch(`${COGNITO.domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: COGNITO.clientId, ...params }),
  })
  if (!res.ok) throw new Error(`Sign-in failed (${res.status})`)
  return (await res.json()) as { id_token: string; access_token: string; refresh_token?: string; expires_in: number }
}

/** Finishes a sign-in on the callback page. Returns where to go next. */
export async function completeSignIn(url: URL): Promise<string> {
  const pending = JSON.parse(storage.get(PENDING, sessionStorage) ?? 'null') as { verifier: string; state: string; returnTo: string } | null
  storage.set(PENDING, null, sessionStorage)
  const code = url.searchParams.get('code')
  if (url.searchParams.get('error')) throw new Error(url.searchParams.get('error_description') ?? 'Sign-in was cancelled')
  if (!code || !pending || url.searchParams.get('state') !== pending.state) throw new Error('This sign-in link has expired. Please try again.')
  const t = await token({ grant_type: 'authorization_code', code, code_verifier: pending.verifier, redirect_uri: redirectUri() })
  writeTokens({ idToken: t.id_token, accessToken: t.access_token, refreshToken: t.refresh_token ?? '', expiresAt: Date.now() + t.expires_in * 1000 })
  return pending.returnTo
}

let refreshing: Promise<Tokens | null> | undefined
/** Current tokens, refreshed when close to expiry; null when signed out. */
async function freshTokens(): Promise<Tokens | null> {
  const t = readTokens()
  if (!t || t.expiresAt - MARGIN_MS > Date.now()) return t
  refreshing ??= token({ grant_type: 'refresh_token', refresh_token: t.refreshToken })
    .then((r) => {
      const next = { ...t, idToken: r.id_token, accessToken: r.access_token, expiresAt: Date.now() + r.expires_in * 1000 }
      writeTokens(next)
      return next
    })
    .catch(() => {
      writeTokens(null) // refresh token expired or revoked: signed out
      return null
    })
    .finally(() => (refreshing = undefined))
  return refreshing
}

/** A current ID token for calling our own server; null when signed out. */
export const getIdToken = async () => (await freshTokens())?.idToken ?? null

/** Cognito's messages for the errors a person can fix. */
const PASSWORD_ERRORS: Record<string, string> = {
  NotAuthorizedException: 'Your current password is not right.',
  LimitExceededException: 'Too many tries. Please wait a while and try again.',
  TooManyRequestsException: 'Too many tries. Please wait a while and try again.',
}

/** Changes the signed-in user's password, straight with Cognito. Throws a message to show. */
export async function changePassword(previous: string, proposed: string) {
  const t = await freshTokens()
  if (!t?.accessToken) throw new Error('Please sign out and in again first.') // a session from before access tokens were kept
  const res = await fetch(`${new URL(COGNITO.issuer).origin}/`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-amz-json-1.1', 'x-amz-target': 'AWSCognitoIdentityProviderService.ChangePassword' },
    body: JSON.stringify({ AccessToken: t.accessToken, PreviousPassword: previous, ProposedPassword: proposed }),
  })
  if (res.ok) return
  const body = (await res.json().catch(() => ({}))) as { __type?: string; message?: string }
  const type = body.__type?.split('#').pop() ?? ''
  throw new Error(PASSWORD_ERRORS[type] ?? body.message ?? `Could not change the password (${res.status})`)
}

/** Forgets the tokens here and ends the Cognito session, coming back to the home page. */
export function signOut() {
  writeTokens(null)
  location.assign(`${COGNITO.domain}/logout?${new URLSearchParams({ client_id: COGNITO.clientId, logout_uri: location.origin + '/' })}`)
}
