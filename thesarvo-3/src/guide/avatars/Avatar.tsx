import { useEffect, useState } from 'react'
import { useUser } from '#/auth/session'
import { GUIDE_PREFIX } from '#/guide/content/paths'
import { avatarFile, emailKey, parseAvatars } from './keys'
import type { AvatarMap } from './keys'

let loaded: Promise<AvatarMap> | undefined
/** `avatars.json`, fetched once per page load; empty when the site has none. */
const avatars = () =>
  (loaded ??= fetch(`${GUIDE_PREFIX}-data/avatars.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .then(parseAvatars)
    .catch(() => ({})))

/** A round picture for someone, or their initial when they have none. `ids` are tried in order. */
export function Avatar({ ids, name, className = 'size-6 text-xs', tone = 'bg-black/10 text-muted' }: { ids: readonly string[]; name: string; className?: string; tone?: string }) {
  const [file, setFile] = useState<string>()
  const key = ids.join('|')
  useEffect(() => {
    let live = true
    void avatars().then((map) => live && setFile(avatarFile(map, key.split('|'))))
    return () => {
      live = false
    }
  }, [key])
  return file ? (
    <img src={`${GUIDE_PREFIX}-data/avatars/${file}`} alt="" loading="lazy" className={`${className} shrink-0 rounded-full object-cover`} />
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
