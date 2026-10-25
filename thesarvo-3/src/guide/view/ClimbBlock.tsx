import type { Climb } from '#/guide/model/types'
import { Lines } from './text'
import { Stars } from './Stars'

/** One climb: blue number, bold name, length and grade, then description and credits (as on the live guide). */
export function ClimbBlock({ climb, highlighted }: { climb: Climb; highlighted?: boolean }) {
  return (
    <article
      id={`climb-${climb.id}`}
      className={`scroll-mt-20 flex gap-3 rounded px-2 py-1.5 text-[13px] leading-snug transition-colors ${highlighted ? 'bg-amber/20' : ''}`}
    >
      <span className="w-7 shrink-0 text-right tabular-nums text-[#0000a0]">
        {climb.number}
        <Stars stars={climb.stars} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-6 font-bold">
          <h3 className="min-w-[8rem] text-[13px] sm:w-52">{climb.name || <span className="text-muted">Unnamed</span>}</h3>
          <span className="flex gap-6">
            <span className="w-12">{climb.length}</span>
            <span className="w-10">{climb.grade}</span>
          </span>
          {climb.extra && <span className="font-normal text-muted">{climb.extra}</span>}
        </div>
        {climb.text && (
          <p className="mt-0.5">
            <Lines text={climb.text} />
          </p>
        )}
        {climb.fa && <p className="mt-0.5 text-[11px] italic text-[#808080]">{climb.fa}</p>}
      </div>
    </article>
  )
}
