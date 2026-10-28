import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { RecentChange } from '#/guide/content/recent'
import { Avatar } from '#/guide/avatars/Avatar'
import { fetchRecent } from '#/guide/server'

const day = (iso: string) => new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * The guides changed most recently, each with who changed it and when, linking to that change on the page's history.
 * Fetched in the browser (the times show in the reader's time zone), so the built page never goes stale.
 */
export function WhatsNew() {
  const [changes, setChanges] = useState<RecentChange[]>([])
  useEffect(() => {
    let live = true
    fetchRecent().then(
      (c) => live && setChanges(c),
      () => {
        /* no feed: the section stays out */
      },
    )
    return () => {
      live = false
    }
  }, [])
  if (!changes.length) return null
  return (
    <section aria-labelledby="whats-new" className="mt-10">
      <h2 id="whats-new" className="border-b border-line pb-1 text-[22px] font-bold text-navy">
        What’s new
      </h2>
      <ul className="mt-3 divide-y divide-line">
        {changes.map((c) => (
          <li key={c.id} className="flex items-start gap-2 py-2">
            <Avatar ids={[c.sub]} name={c.name} className="mt-0.5 size-6 text-xs" />
            <div>
            <Link to="/g/$" params={{ _splat: c.path }} search={{ history: true }} hash={c.session} rel="nofollow" className="font-semibold text-link hover:underline">
              {c.title}
            </Link>
            <span className="text-muted">
              {' '}
              · {c.name ? `${c.name} ` : ''}
              {c.description}
              {' · '}
              {day(c.at)}
            </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
