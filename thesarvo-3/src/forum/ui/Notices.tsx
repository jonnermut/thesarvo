import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { notices } from '../client'
import type { Notice } from '../types'
import { Body } from './Body'

/** Posts an admin marked as notices, at the top of the home page: title and text, with a link to the post and its comments. */
export function Notices() {
  const [list, setList] = useState<Notice[]>([])
  useEffect(() => {
    let live = true
    void notices().then((n) => live && setList(n.filter((x) => x.until > new Date().toISOString())))
    return () => {
      live = false
    }
  }, [])
  if (!list.length) return null
  return (
    <section aria-label="Notices" className="mt-6 space-y-3">
      {list.map((n) => (
        <article key={n.id} className="rounded-lg border border-amber bg-amber/10 p-4">
          <h2 className="text-lg font-bold text-navy">{n.title}</h2>
          <div className="mt-1">
            <Body html={n.html} text={n.text} />
          </div>
          <Link to="/g/forum" search={{ thread: n.id }} rel="nofollow" className="mt-2 inline-block text-sm text-link hover:underline">
            Discuss in the forum
          </Link>
        </article>
      ))}
    </section>
  )
}
