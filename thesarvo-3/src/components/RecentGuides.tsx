import { Link } from '@tanstack/react-router'
import { guideUrl } from '#/guide/content/paths'
import { useRecent } from '#/guide/recent'

/** Guides opened lately in this browser, leaving out the one on screen; nothing until there are some. */
export function RecentGuides({ current, onPick, className = '' }: { current?: string; onPick?: () => void; className?: string }) {
  const recent = useRecent().filter((r) => r.path !== current)
  if (!recent.length) return null
  return (
    <div className={className}>
      <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Recently viewed</p>
      <ul className="mt-1 flex flex-wrap gap-1.5">
        {recent.map((r) => (
          <li key={r.path}>
            <Link to={guideUrl(r)} onClick={onPick} className="block rounded-full border border-line bg-white px-2.5 py-0.5 text-[13px] text-navy hover:border-link hover:text-link">
              {r.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
