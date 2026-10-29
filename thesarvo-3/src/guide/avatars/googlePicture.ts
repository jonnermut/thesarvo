import { call } from '#/auth/apiCall'
import { claims, getIdToken } from '#/auth/session'
import { avatars, reloadAvatars } from './Avatar'
import { avatarFile, emailKey } from './keys'
import { shrink } from './shrink'

const TRIED = 'thesarvo.picture.tried'

/**
 * After a Google sign-in: the profile picture Google gave (the `picture` claim) becomes the person's picture, shrunk
 * here like an uploaded one. Only when they have none yet, uploaded or imported from the old site, and only once per
 * browser so a picture they remove stays removed. Quiet when anything fails (Google's server may refuse the fetch).
 */
export async function importGooglePicture() {
  try {
    const token = await getIdToken()
    const c = token ? claims(token) : null
    const picture = c?.picture
    if (!c || typeof picture !== 'string' || !picture.startsWith('https://') || !Array.isArray(c.identities)) return
    const sub = String(c.sub)
    if (localStorage.getItem(TRIED) === sub) return
    localStorage.setItem(TRIED, sub)
    const maps = await avatars()
    const ids = [sub, await emailKey(String(c.email ?? ''))]
    if (avatarFile(maps.uploaded, ids) || avatarFile(maps.imported, ids)) return
    const res = await fetch(picture)
    if (!res.ok) return
    const saved = await call<{ file: string }>('avatar', { method: 'POST', body: JSON.stringify({ image: await shrink(await res.blob()) }) })
    if (saved.ok) reloadAvatars()
  } catch {
    /* no picture imported */
  }
}
