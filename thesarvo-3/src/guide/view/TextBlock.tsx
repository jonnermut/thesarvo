import type { TextBlock as TextBlockModel } from '#/guide/model/types'
import { Lines } from './text'

export function TextBlock({ block }: { block: TextBlockModel }) {
  const content = <Lines text={block.text} />
  switch (block.cls) {
    case 'heading1':
      return <h2 className="pt-6 font-display text-3xl font-semibold">{content}</h2>
    case 'heading2':
      return <h2 className="pt-6 font-display text-2xl font-semibold text-forest">{content}</h2>
    case 'heading3':
      return <h3 className="pt-3 font-display text-xl font-semibold text-forest">{content}</h3>
    case 'pagebreak':
      return <hr className="my-6 border-line" />
    default:
      return <p className="leading-relaxed text-ink/85">{content}</p>
  }
}
