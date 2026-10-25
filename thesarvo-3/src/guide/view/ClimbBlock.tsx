import type { Climb } from '#/guide/model/types'
import { Lines } from './text'
import { Stars } from './Stars'

export function ClimbBlock({ climb, highlighted }: { climb: Climb; highlighted?: boolean }) {
  const isProblem = climb.type === 'problem'
  return (
    <article
      id={`climb-${climb.id}`}
      className={`scroll-mt-20 rounded-lg border bg-card px-4 py-3 shadow-sm transition-colors ${highlighted ? 'border-amber ring-2 ring-amber/40' : 'border-line'}`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="w-7 text-right font-semibold text-muted tabular-nums">{climb.number}</span>
        <h3 className="font-semibold">{climb.name || <span className="text-muted">Unnamed</span>}</h3>
        <Stars stars={climb.stars} />
        {climb.grade && (
          <span className={`rounded px-2 py-0.5 text-sm font-semibold ${isProblem ? 'bg-amber/20 text-amber-deep' : 'bg-forest text-white'}`}>
            {climb.grade}
          </span>
        )}
        {climb.extra && <span className="text-sm text-muted">{climb.extra}</span>}
        {climb.length && <span className="ml-auto text-sm text-muted">{climb.length}</span>}
      </div>
      {climb.text && (
        <p className="mt-1.5 pl-10 text-[0.95rem] leading-relaxed text-ink/85">
          <Lines text={climb.text} />
        </p>
      )}
      {climb.fa && <p className="mt-1 pl-10 text-sm text-muted italic">FA: {climb.fa}</p>}
    </article>
  )
}
