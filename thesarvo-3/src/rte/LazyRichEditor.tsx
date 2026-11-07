import { lazy, Suspense } from 'react'
import type { RichEditorProps } from './RichEditor'

const RichEditor = lazy(() => import('./RichEditor'))

/** The rich text box, loaded when it is first shown so no reader downloads it (scripts/check-bundle.ts guards that). */
export function LazyRichEditor(props: RichEditorProps) {
  return (
    <Suspense fallback={<div role="status" className={`rounded-md border border-line bg-card px-3 py-2 text-muted ${props.compact ? 'min-h-24' : 'min-h-64'}`}>Loading the editor…</div>}>
      <RichEditor {...props} />
    </Suspense>
  )
}
