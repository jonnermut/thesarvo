import type { ReactNode } from 'react'

/**
 * Guide text that was written in the rich text box. It is allow-listed on every save (`cleanNode`), so it is shown as it is.
 * Internal page links (`data-page`) are resolved by the site's link handling, as in prose pages.
 */
export function RichHtml({ html, className = '' }: { html: string; className?: string }) {
  return <div className={`guide-rich ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
}

/** A note or warning: a bar and a tinted box. */
export function Callout({ kind, children }: { kind: 'note' | 'warning'; children: ReactNode }) {
  return (
    <aside role={kind === 'warning' ? 'alert' : 'note'} className={`callout ${kind} flex gap-3`}>
      <strong className="shrink-0 text-xs uppercase leading-snug tracking-wide">{kind === 'warning' ? 'Warning' : 'Note'}</strong>
      <div className="min-w-0 flex-1">{children}</div>
    </aside>
  )
}
