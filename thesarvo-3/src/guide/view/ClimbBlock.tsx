import type { Climb } from '#/guide/model/types'
import { Lines } from './text'
import { Stars } from './Stars'

/** Shared by the editor form so the fields sit where the display puts them: number, name, stars, length, grade, extra. */
export const ROW = 'flex flex-wrap items-baseline gap-x-4 gap-y-0.5 sm:grid sm:grid-cols-[2rem_13rem_3.5rem_3rem_2.5rem_1fr] sm:gap-x-3'
const INDENT = 'sm:ml-[2.75rem]'

/** One climb: blue number, bold name, length and grade, then description and credits (as on the live guide). */
export function ClimbBlock({ climb, highlighted }: { climb: Climb; highlighted?: boolean }) {
  return (
    <article
      id={`climb-${climb.id}`}
      className={`scroll-mt-20 rounded px-2 py-1.5 text-[13px] leading-snug transition-colors ${highlighted ? 'bg-amber/20' : ''}`}
    >
      <div className={ROW}>
        <span className="w-7 text-right font-bold tabular-nums text-[#0000a0] sm:w-auto">{climb.number}</span>
        <h3 className="min-w-[8rem] flex-1 text-[13px] font-bold sm:flex-none">{climb.name || <span className="text-muted">Unnamed</span>}</h3>
        <span className="text-[#0000a0]">
          <Stars stars={climb.stars} />
        </span>
        <span className="font-bold">{climb.length}</span>
        <span className="font-bold">{climb.grade}</span>
        {climb.extra && <span className="text-muted sm:col-auto">{climb.extra.replace(/B$/, 'Þ')}</span>}
      </div>
      {climb.text && (
        <p className={`mt-0.5 ${INDENT}`}>
          <Lines text={climb.text} />
        </p>
      )}
      {climb.fa && <p className={`mt-0.5 text-[11px] italic text-[#808080] ${INDENT}`}>{climb.fa}</p>}
    </article>
  )
}
