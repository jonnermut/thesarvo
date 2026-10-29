import { Link } from '@tanstack/react-router'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { notices } from '../client'
import type { Notice } from '../types'
import { Body } from './Body'

/** A notice's text is cut to about this tall (rem) until "Read more" is pressed, so a long one cannot push the guides down the page. */
const CLAMP_REM = 9

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
        <NoticeCard key={n.id} n={n} />
      ))}
    </section>
  )
}

function NoticeCard({ n }: { n: Notice }) {
  const text = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [long, setLong] = useState(false)
  // Measured with the text unclamped by the browser's own layout, so it holds for any width or font size.
  useLayoutEffect(() => {
    const el = text.current
    if (el) setLong(el.scrollHeight > CLAMP_REM * parseFloat(getComputedStyle(document.documentElement).fontSize || '16') + 4)
  }, [n])
  const clamped = long && !open
  return (
    <article className="card relative overflow-hidden border-l-4 border-l-amber bg-linear-to-br from-amber/15 via-card to-card p-4 pl-5">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-amber text-white shadow-sm">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-widest text-amber-deep uppercase">Notice</p>
          <h2 className="text-xl font-bold text-navy">{n.title}</h2>
          <div className="relative mt-1">
            <div ref={text} style={clamped ? { maxHeight: `${CLAMP_REM}rem` } : undefined} className={clamped ? 'overflow-hidden' : undefined}>
              <Body html={n.html} text={n.text} />
            </div>
            {clamped && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-card to-transparent" />}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {long && (
              <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="font-medium text-link hover:underline">
                {open ? 'Show less' : 'Read more'}
              </button>
            )}
            <Link to="/g/forum" search={{ thread: n.id }} rel="nofollow" className="text-link hover:underline">
              Discuss in the forum
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
