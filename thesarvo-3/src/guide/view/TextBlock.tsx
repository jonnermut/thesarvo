import type { TextBlock as TextBlockModel } from '#/guide/model/types'
import { Lines } from './text'

export function TextBlock({ block }: { block: TextBlockModel }) {
  const content = <Lines text={block.text} />
  switch (block.cls) {
    case 'heading1':
      return <h2 className="border-b border-line pt-4 text-[28px] font-bold text-navy">{content}</h2>
    case 'heading2':
      return <h2 className="border-b border-line pt-4 text-2xl text-navy">{content}</h2>
    case 'heading3':
      return <h3 className="pt-3 text-[18.7px] font-bold">{content}</h3>
    case 'pagebreak':
      return <hr className="my-6 border-line" />
    default:
      return <p className="text-[13px] leading-snug">{content}</p>
  }
}
