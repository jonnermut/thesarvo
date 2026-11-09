import { Link } from '@tanstack/react-router'
import { guideUrl } from '#/guide/content/paths'
import type { IndexNode } from '#/guide/content/types'

/** "Guides › South East › South Arm": the way up from the current page. `then` is a view of the page (History): the page becomes a crumb and `then` the current entry. */
export function Breadcrumbs({ trail, current, width, end, then }: { trail: IndexNode[]; current: IndexNode; width: string; end?: React.ReactNode; then?: string }) {
  if (!trail.length && !then) return null
  return (
    <nav aria-label="Breadcrumb" className={`no-print mx-auto flex items-start gap-2 pt-4 ${width}`}>
      <ol className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
        {trail.map((n) => (
          <li key={n.id} className="flex items-center gap-1.5">
            <Link to={guideUrl(n)} className="text-link hover:underline">
              {n.path ? n.title : 'Guides'}
            </Link>
            <span aria-hidden>›</span>
          </li>
        ))}
        {then ? (
          <>
            <li className="flex items-center gap-1.5">
              <Link to={guideUrl(current)} className="text-link hover:underline">
                {current.title}
              </Link>
              <span aria-hidden>›</span>
            </li>
            <li aria-current="page" className="text-ink">
              {then}
            </li>
          </>
        ) : (
          <li aria-current="page" className="text-ink">
            {current.title}
          </li>
        )}
      </ol>
      {end && <div className="-mt-1 ml-auto">{end}</div>}
    </nav>
  )
}
