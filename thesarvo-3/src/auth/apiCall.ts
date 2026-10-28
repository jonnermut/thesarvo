import { getIdToken } from '#/auth/session'
import { GUIDE_PREFIX } from '#/guide/content/paths'

/** What the server said, as far as the saver cares. */
export type Answer<T> = { ok: true; value: T } | { ok: false; unavailable?: boolean; message: string }

/** A request to the app's own API with the signed-in user's ID token. */
export const call = async <T>(path: string, init: RequestInit = {}): Promise<Answer<T>> => {
  const token = await getIdToken()
  if (!token) return { ok: false, message: 'Sign in again to save' }
  try {
    const res = await fetch(`${GUIDE_PREFIX}/api/${path}`, { ...init, headers: { ...init.headers, authorization: `Bearer ${token}`, 'content-type': 'application/json' } })
    const body = (await res.json().catch(() => ({}))) as T & { error?: string }
    // 409 is a conflict, which the body describes.
    if (res.ok || res.status === 409) return { ok: true, value: body }
    return { ok: false, unavailable: res.status === 501, message: body.error ?? `Saving failed (${res.status})` }
  } catch {
    return { ok: false, message: 'Offline' }
  }
}
