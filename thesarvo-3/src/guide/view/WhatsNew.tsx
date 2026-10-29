import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { RecentChange } from '#/guide/content/recent'
import { Avatar } from '#/guide/avatars/Avatar'
import { fetchRecent } from '#/guide/server'

/** Changes a card shows. */
const SHOWN = 5

const day = (iso: string) => new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * The guides changed most recently, each with who changed it and when, linking to that change on the page's history.
 * Fetched in the browser (the times show in the reader's time zone), so the built page never goes stale. A card (a list item) in the home page's contents grid.
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
    <li className="min-w-0">
      <section aria-labelledby="whats-new" className="card h-full p-3">
        <h2 id="whats-new" className="text-[17px] font-semibold text-navy">
          What’s new
        </h2>
        <ul className="mt-2 space-y-1.5 text-[13px]">
          {changes.slice(0, SHOWN).map((c) => (
            <li key={c.id} className="flex items-start gap-2">
              <Avatar ids={[c.sub]} name={c.name} className="mt-0.5 size-5 shrink-0 text-[10px]" />
              <div className="min-w-0">
                <Link to="/g/$" params={{ _splat: c.path }} search={{ history: true }} hash={c.session} rel="nofollow" className="font-semibold text-link hover:underline">
                  {c.title}
                </Link>
                <span className="text-muted">
                  {' '}
                  · {c.name ? `${c.name} ` : ''}
                  {c.description} · {day(c.at)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </li>
  )
}
