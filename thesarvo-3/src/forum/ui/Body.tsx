import type { ReactNode } from 'react'

const LINK = /(https?:\/\/[^\s<]+[^\s<.,;:!?)'"])/g

/** Plain text as paragraphs, with web addresses made into links. No HTML is ever taken from what people type. */
function plain(text: string): ReactNode {
  return text.split(/\n{2,}/).map((para, i) => (
    <p key={i} className="whitespace-pre-wrap">
      {para.split(LINK).map((part, j) =>
        j % 2 ? (
          <a key={j} href={part} rel="nofollow noopener noreferrer" target="_blank" className="break-all text-link hover:underline">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </p>
  ))
}

/** A post's or comment's text: imported posts are allow-listed HTML from the export (as prose pages are), new ones plain text. */
export function Body({ html, text }: { html?: string; text?: string }) {
  if (html) return <div className="page-prose" dangerouslySetInnerHTML={{ __html: html }} />
  return <div className="space-y-2">{plain(text ?? '')}</div>
}
