import type { TextBlock as TextBlockModel } from '#/guide/model/types'
import { Lines } from './text'

const BODY = 'text-[13px] leading-snug sm:text-justify'

/** Turns bare URLs (class "html" blocks) into links. */
function Linkified({ text }: { text: string }) {
  return text.split(/(https?:\/\/\S+)/).map((part, i) =>
    i % 2 ? (
      <a key={i} href={part} className="text-link underline">
        {part}
      </a>
    ) : (
      part
    ),
  )
}

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
    case 'noPrint':
      return <p className={`${BODY} print:hidden`}>{content}</p>
    case 'html':
      return <p className={BODY}><Linkified text={block.text} /></p>
    case 'indentedHeader': {
      // "Head: body" lays out as a heading column beside the body, stacked on phones.
      const i = block.text.indexOf(':')
      if (i > -1)
        return (
          <section className="gap-6 sm:grid sm:grid-cols-[13rem_1fr]">
            <h3 className="mb-1 h-fit border-b border-line text-[18.7px] font-bold text-navy sm:mb-0">{block.text.slice(0, i)}</h3>
            <p className={BODY}>
              <Lines text={block.text.slice(i + 1).trim()} />
            </p>
          </section>
        )
      return <p className={BODY}>{content}</p>
    }
    default:
      return <p className={BODY}>{content}</p>
  }
}
