import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { recentThreads } from '../client'
import { Avatar } from '#/guide/avatars/Avatar'
import type { ThreadMeta } from '../types'

/** Threads a card shows. */
const SHOWN = 5

const day = (iso: string) => new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

/** The newest forum posts with their comment counts, as a card in the home page's contents grid. Anyone sees the titles; opening one needs a sign-in. */
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
    <li className="min-w-0">
      <section aria-labelledby="forum-feed" className="card h-full p-3">
        <h2 id="forum-feed" className="text-[17px] font-semibold">
          <Link to="/g/forum" search={{}} className="text-link hover:underline">
            Forum
          </Link>
        </h2>
        <ul className="mt-2 space-y-1.5 text-[13px]">
          {threads.slice(0, SHOWN).map((t) => (
            <li key={t.id} className="flex items-start gap-2">
              <Avatar ids={[t.author.sub, t.author.key].filter((x): x is string => !!x)} name={t.author.name} className="mt-0.5 size-5 shrink-0 text-[10px]" />
              <div className="line-clamp-2 min-w-0">
                <Link to="/g/forum" search={{ thread: t.id }} rel="nofollow" className="font-semibold text-link hover:underline">
                  {t.title}
                </Link>
                <span className="text-muted">
                  {' '}
                  · {t.author.name} · {day(t.last)} · {t.comments} {t.comments === 1 ? 'comment' : 'comments'}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <Link to="/g/forum" search={{}} className="mt-2 inline-block text-[13px] text-link hover:underline">
          More
        </Link>
      </section>
    </li>
  )
}
