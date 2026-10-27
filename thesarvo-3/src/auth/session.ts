import { useSyncExternalStore } from 'react'
import { COGNITO } from './config'
import { CALLBACK_PATH } from './paths'

/**
 * Sign-in in the browser alone, so it works on the static site: Cognito's managed login with PKCE,
 * tokens kept in localStorage and refreshed straight from Cognito's token endpoint.
 */

export type User = { sub: string; email: string; name: string }
type Tokens = { idToken: string; refreshToken: string; expiresAt: number }

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
    cached = { raw, user: c ? { sub: String(c.sub), email: String(c.email ?? ''), name: String(c.name ?? c.email ?? '') } : null }
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
export async function signIn(returnTo = location.pathname + location.search) {
  const verifier = random()
  const state = random()
  storage.set(PENDING, JSON.stringify({ verifier, state, returnTo }), sessionStorage)
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))))
  const q = new URLSearchParams({
    client_id: COGNITO.clientId,
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: redirectUri(),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  location.assign(`${COGNITO.domain}/oauth2/authorize?${q}`)
}

async function token(params: Record<string, string>) {
  const res = await fetch(`${COGNITO.domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: COGNITO.clientId, ...params }),
  })
  if (!res.ok) throw new Error(`Sign-in failed (${res.status})`)
  return (await res.json()) as { id_token: string; refresh_token?: string; expires_in: number }
}

/** Finishes a sign-in on the callback page. Returns where to go next. */
export async function completeSignIn(url: URL): Promise<string> {
  const pending = JSON.parse(storage.get(PENDING, sessionStorage) ?? 'null') as { verifier: string; state: string; returnTo: string } | null
  storage.set(PENDING, null, sessionStorage)
  const code = url.searchParams.get('code')
  if (url.searchParams.get('error')) throw new Error(url.searchParams.get('error_description') ?? 'Sign-in was cancelled')
  if (!code || !pending || url.searchParams.get('state') !== pending.state) throw new Error('This sign-in link has expired. Please try again.')
  const t = await token({ grant_type: 'authorization_code', code, code_verifier: pending.verifier, redirect_uri: redirectUri() })
  writeTokens({ idToken: t.id_token, refreshToken: t.refresh_token ?? '', expiresAt: Date.now() + t.expires_in * 1000 })
  return pending.returnTo
}

let refreshing: Promise<string | null> | undefined
/** A current ID token for calling our own server, refreshed when close to expiry; null when signed out. */
export async function getIdToken(): Promise<string | null> {
  const t = readTokens()
  if (!t) return null
  if (t.expiresAt - MARGIN_MS > Date.now()) return t.idToken
  refreshing ??= token({ grant_type: 'refresh_token', refresh_token: t.refreshToken })
    .then((r) => {
      writeTokens({ ...t, idToken: r.id_token, expiresAt: Date.now() + r.expires_in * 1000 })
      return r.id_token
    })
    .catch(() => {
      writeTokens(null) // refresh token expired or revoked: signed out
      return null
    })
    .finally(() => (refreshing = undefined))
  return refreshing
}

/** Forgets the tokens here and ends the Cognito session, coming back to the home page. */
export function signOut() {
  writeTokens(null)
  location.assign(`${COGNITO.domain}/logout?${new URLSearchParams({ client_id: COGNITO.clientId, logout_uri: location.origin + '/' })}`)
}
