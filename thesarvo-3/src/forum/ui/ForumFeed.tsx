import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { recentThreads } from '../client'
import type { ThreadMeta } from '../types'

const day = (iso: string) => new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

/** The newest forum posts with their comment counts, on the home page. Anyone sees the titles; opening one needs a sign-in. */
export function ForumFeed() {
  const [threads, setThreads] = useState<ThreadMeta[]>([])
  useEffect(() => {
    let live = true
    void recentThreads().then((t) => live && setThreads(t))
    return () => {
      live = false
    }
  }, [])
  if (!threads.length) return null
  return (
    <section aria-labelledby="forum-feed" className="mt-10">
      <h2 id="forum-feed" className="border-b border-line pb-1 text-[22px] font-bold text-navy">
        <Link to="/g/forum" search={{}} className="hover:underline">
          Forum
        </Link>
      </h2>
      <ul className="mt-3 divide-y divide-line">
        {threads.map((t) => (
          <li key={t.id} className="py-2">
            <Link to="/g/forum" search={{ thread: t.id }} rel="nofollow" className="font-semibold text-link hover:underline">
              {t.title}
            </Link>
            <span className="text-muted">
              {' '}
              · {t.author.name} · {day(t.last)} · {t.comments} {t.comments === 1 ? 'comment' : 'comments'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
