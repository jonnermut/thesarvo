import { useRef, useState } from 'react'
import { LazyRichEditor } from './LazyRichEditor'

/**
 * A labelled rich text box for guide text (the guide profile: paragraphs, bold, italic, lists, links). The editor owns the text while it is
 * typed in; a `value` it did not produce itself (an undo, a restyle) replaces the text.
 */
export function RichField({ label, value, onChange, className = '', placeholder }: { label: string; value: string; onChange: (html: string) => void; className?: string; placeholder?: string }) {
  const last = useRef(value)
  const box = useRef<HTMLDivElement>(null)
  const [gen, setGen] = useState(0)
  if (value !== last.current) {
    // The save hands back the server's tidied copy of what was typed: leave the box alone while it is being typed in.
    const typing = box.current?.contains(document.activeElement) ?? false
    last.current = value
    if (!typing) setGen((g) => g + 1)
  }
  return (
    <div ref={box} className={`min-w-0 ${className}`}>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <LazyRichEditor
        key={gen}
        guide
        initial={value}
        label={label}
        placeholder={placeholder}
        onChange={(html) => {
          last.current = html
          onChange(html)
        }}
      />
    </div>
  )
}
