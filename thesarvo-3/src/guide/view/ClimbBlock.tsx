import type { Climb } from '#/guide/model/types'
import { Fragment, useState } from 'react'
import { Lines, splitLines } from './text'
import { Stars } from './Stars'

/** Shared by the editor form so the fields sit where the display puts them: number, name, stars, length, grade, extra. */
export const ROW = 'flex flex-wrap items-baseline gap-x-4 gap-y-0.5 sm:grid sm:grid-cols-[2rem_13rem_3.5rem_3rem_2.5rem_1fr] sm:gap-x-3'
const INDENT = 'sm:ml-[2.75rem]'

/**
 * One climb: blue number, bold name, length and grade, then description and credits (as on the live
 * guide). With an anchor, the number links to the climb and copies that link where the browser allows.
 */
export function ClimbBlock({ climb, highlighted, anchor }: { climb: Climb; highlighted?: boolean; anchor?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () =>
    navigator.clipboard?.writeText(`${location.origin}${location.pathname}#${anchor}`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }, () => {})
  // "160m (approx)" and "25 or 22 (variant)": the bracketed note moves to the last column, where there is room, instead of wrapping in a narrow one.
  const length = withNote(climb.length)
  const grade = withNote(climb.grade)
  const long = grade.main.length > 5
  const extra = [length.note, grade.note, climb.extra.replace(/B$/, 'Þ')].filter(Boolean).join(' ')
  return (
    <article
      className={`rounded px-2 py-1.5 text-[13px] leading-snug transition-colors ${highlighted ? 'bg-amber/20' : ''}`}
    >
      <div className={ROW}>
        <span className="w-7 text-right font-bold tabular-nums text-[#0000a0] sm:w-auto">
          {/* An unnumbered climb shows nothing here: a stand-in "#" read as a number. */}
          {anchor && climb.number ? (
            <a href={`#${anchor}`} onClick={copy} title="Link to this climb" className="hover:underline">
              {climb.number}
            </a>
          ) : (
            climb.number
          )}
        </span>
        <h3 className="min-w-[8rem] flex-1 text-[13px] font-bold sm:flex-none">
          {climb.name || <span className="text-muted">Unnamed</span>}
          {copied && (
            <span role="status" className="ml-2 text-[11px] font-normal text-forest">
              Link copied
            </span>
          )}
        </h3>
        <span className="text-[#0000a0]">
          <Stars stars={climb.stars} />
        </span>
        <span className="font-bold whitespace-nowrap">{length.main}</span>
        {/* A long grade ("25 or 22") would wrap word by word in the narrow grade column, so it takes the last column too, with what follows it. */}
        {long ? (
          <span className="sm:col-span-2 sm:whitespace-nowrap">
            <b>{grade.main}</b> <span className="text-muted">{extra}</span>
          </span>
        ) : (
          <>
            <span className="font-bold whitespace-nowrap">{grade.main}</span>
            {extra && <span className="text-muted sm:col-auto">{extra}</span>}
          </>
        )}
      </div>
      {climb.text && <Description text={climb.text} />}
      {climb.fa && <p className={`mt-0.5 text-[11px] italic text-[#808080] ${INDENT}`}>{climb.fa}</p>}
    </article>
  )
}

/** A value and the bracketed note after it: "160m (approx)" is `160m` and `(approx)`. */
export function withNote(value: string): { main: string; note: string } {
  const m = /^(.*?\S)\s+(\([^)]*\))$/.exec(value.trim())
  return m ? { main: m[1], note: m[2] } : { main: value, note: '' }
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

/** Pitches run together in one line ("... 1. 45m 18. Climb ... 2. 30m 20. Traverse ...") get a line each, so the pitch column below can show them. */
export function splitPitches(text: string): string {
  const mark = /(^|\s)(?=\d{1,2}\. \d{1,3} ?m\b)/g
  if ((text.match(mark)?.length ?? 0) < 2) return text
  return text.replace(mark, (_, lead: string, at: number) => (at === 0 ? lead : '<br>'))
}

function Description({ text }: { text: string }) {
  const lines = splitLines(text).flatMap((l) => splitLines(splitPitches(l)))
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
