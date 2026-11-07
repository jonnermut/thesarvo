/** Video hosts the editor can embed, as the address of the player page (never an address typed by the user as it is). */
const ID = /^[\w-]{6,20}$/

/** The player address for a YouTube or Vimeo link, or null for anything else. */
export function embedUrl(input: string): string | null {
  let u: URL
  try {
    u = new URL(input.trim())
  } catch {
    return null
  }
  const host = u.hostname.replace(/^(www|m)\./, '')
  if (host === 'youtu.be') return youtube(u.pathname.slice(1))
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') return youtube(u.searchParams.get('v') ?? '')
    const m = /^\/(?:embed|shorts|live)\/([^/]+)/.exec(u.pathname)
    return m ? youtube(m[1]) : null
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = /^(?:\/video)?\/(\d{5,12})(?:\/|$)/.exec(u.pathname)
    return m ? `https://player.vimeo.com/video/${m[1]}` : null
  }
  return null
}

const youtube = (id: string) => (ID.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null)

/** Whether `src` is a player address `embedUrl` could have made: the only iframes a saved page may hold. */
export const isEmbedSrc = (src: string) => /^https:\/\/(?:www\.youtube-nocookie\.com\/embed\/[\w-]{6,20}|player\.vimeo\.com\/video\/\d{5,12})$/.test(src)
