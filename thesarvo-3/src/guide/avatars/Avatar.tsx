import { useEffect, useState } from 'react'
import { useUser } from '#/auth/session'
import { GUIDE_PREFIX } from '#/guide/content/paths'
import { avatarFile, emailKey, parseAvatars } from './keys'
import type { AvatarMap } from './keys'

const fetchMap = (url: string) =>
  fetch(url)
    .then((r) => (r.ok ? r.json() : {}))
    .then(parseAvatars)
    .catch(() => ({}))

/** Imported pictures (`g-data/avatars.json`, built with the site) and the ones people uploaded (`avatars/uploaded.json`, by sub); the latter win. */
type Maps = { imported: AvatarMap; uploaded: AvatarMap }
let loaded: Promise<Maps> | undefined
/** Fetched once per page load; empty when the site has none. */
export const avatars = () => (loaded ??= Promise.all([fetchMap(`${GUIDE_PREFIX}-data/avatars.json`), fetchMap('/avatars/uploaded.json')]).then(([imported, uploaded]) => ({ imported, uploaded })))

/** After someone changes their picture: every avatar on the page looks again. */
export function reloadAvatars() {
  loaded = undefined
  window.dispatchEvent(new Event('avatars-changed'))
}

const urlFor = ({ imported, uploaded }: Maps, ids: readonly string[]) => {
  const mine = avatarFile(uploaded, ids)
  if (mine) return `/avatars/${mine}`
  const old = avatarFile(imported, ids)
  return old && `${GUIDE_PREFIX}-data/avatars/${old}`
}

/** A round picture for someone, or their initial when they have none. `ids` are tried in order. */
export function Avatar({ ids, name, className = 'size-6 text-xs', tone = 'bg-black/10 text-muted' }: { ids: readonly string[]; name: string; className?: string; tone?: string }) {
  const [src, setSrc] = useState<string>()
  const key = ids.join('|')
  useEffect(() => {
    let live = true
    const look = () => void avatars().then((maps) => live && setSrc(urlFor(maps, key.split('|'))))
    look()
    window.addEventListener('avatars-changed', look)
    return () => {
      live = false
      window.removeEventListener('avatars-changed', look)
    }
  }, [key])
  return src ? (
    <img src={src} alt="" loading="lazy" className={`${className} shrink-0 rounded-full object-cover`} />
  ) : (
    <span aria-hidden className={`${className} grid shrink-0 place-items-center rounded-full font-semibold uppercase ${tone}`}>
      {name.trim().charAt(0)}
    </span>
  )
}

/** The signed-in person's own picture: found by their sub, then by their email. */
export function MyAvatar({ className, tone }: { className?: string; tone?: string }) {
  const user = useUser()
  const [key, setKey] = useState('')
  const email = user?.email ?? ''
  useEffect(() => {
    let live = true
    if (email) void emailKey(email).then((k) => live && setKey(k))
    return () => {
      live = false
    }
  }, [email])
  return user ? <Avatar ids={[user.sub, key].filter(Boolean)} name={user.name || user.email} className={className} tone={tone} /> : null
}
