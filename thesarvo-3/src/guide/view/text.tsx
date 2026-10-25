import { Fragment } from 'react'

/** Guide text uses literal `<br/>` for line breaks. */
export const splitLines = (s: string) => s.split(/<br\s*\/?>/i)

export function Lines({ text }: { text: string }) {
  const lines = splitLines(text)
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line}
    </Fragment>
  ))
}
