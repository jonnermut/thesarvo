import type { Climb } from '#/guide/model/types'
import { Fragment } from 'react'
import { Lines, splitLines } from './text'
import { Stars } from './Stars'

/** Shared by the editor form so the fields sit where the display puts them: number, name, stars, length, grade, extra. */
export const ROW = 'flex flex-wrap items-baseline gap-x-4 gap-y-0.5 sm:grid sm:grid-cols-[2rem_13rem_3.5rem_3rem_2.5rem_1fr] sm:gap-x-3'
const INDENT = 'sm:ml-[2.75rem]'

/** One climb: blue number, bold name, length and grade, then description and credits (as on the live guide). */
/** `anchor` is off for copies shown in popups, so the page keeps one element per `#climb-id`. */
export function ClimbBlock({ climb, highlighted, anchor = true }: { climb: Climb; highlighted?: boolean; anchor?: boolean }) {
  return (
    <article
      id={anchor ? `climb-${climb.id}` : undefined}
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
      {climb.text && <Description text={climb.text} />}
      {climb.fa && <p className={`mt-0.5 text-[11px] italic text-[#808080] ${INDENT}`}>{climb.fa}</p>}
    </article>
  )
}

/** Multi-pitch text ("1. 20m 18 ..." per line) gets a label column; other text is a justified paragraph. */
export function parsePitch(line: string): { label: string; text: string } {
  const t = line.trim()
  let idx = t.indexOf('. ')
  const idx2 = idx > 0 ? t.indexOf('. ', idx + 1) : -1
  if (idx2 > 0 && idx2 < 16) idx = idx2
  if (t.length > 1 && /\d/.test(t[0] ?? '') && idx > 0 && idx < 16) {
    const label = t.slice(0, idx).trim()
    return { label: label.length <= 2 ? `${label}.` : label, text: t.slice(idx + 2).trim() }
  }
  return { label: '', text: t }
}

function Description({ text }: { text: string }) {
  const lines = splitLines(text)
  const pitches = lines.length > 1 && lines.some((l) => parsePitch(l).label)
  if (!pitches)
    return (
      <p className={`mt-0.5 sm:text-justify ${INDENT}`}>
        <Lines text={text} />
      </p>
    )
  return (
    <div className={`mt-0.5 grid grid-cols-[auto_1fr] gap-x-2 sm:text-justify ${INDENT}`}>
      {lines.map((line, i) => {
        const p = parsePitch(line)
        return p.label ? (
          <Fragment key={i}>
            <span className="font-bold text-[#0000a0]">{p.label}</span>
            <span>{p.text}</span>
          </Fragment>
        ) : (
          <span key={i} className="col-span-2">{p.text}</span>
        )
      })}
    </div>
  )
}
