import { Fragment } from 'react'
import { splitLines } from './breaks'

export { splitLines }

export function Lines({ text }: { text: string }) {
  const lines = splitLines(text)
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line}
    </Fragment>
  ))
}
