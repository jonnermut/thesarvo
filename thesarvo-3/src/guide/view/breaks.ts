/** Guide text uses literal `<br/>` for line breaks. */
export const splitLines = (s: string) => s.split(/<br\s*\/?>/i)

/** Climb text as paragraphs of lines: blank lines (any run) only separate paragraphs, and none lead or trail the text. */
export function paragraphs(text: string): string[][] {
  const out: string[][] = []
  let gap = false
  for (const raw of splitLines(text)) {
    const line = raw.replace(/\u00a0/g, ' ').trim()
    if (!line) {
      gap = out.length > 0
      continue
    }
    if (gap || !out.length) out.push([])
    out[out.length - 1].push(line)
    gap = false
  }
  return out
}

/** The text with its breaks tidied: no blank line at the start or end, one blank line between paragraphs, lines trimmed. */
export const tidyBreaks = (text: string): string => paragraphs(text).map((p) => p.join('<br/>')).join('<br/><br/>')
