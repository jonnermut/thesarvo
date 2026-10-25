import type { Header } from '#/guide/model/types'
import { Lines } from './text'

const FACTS = [
  ['Walk', 'walk'],
  ['Sun', 'sun'],
  ['Rock', 'rock'],
] as const

const SECTIONS = [
  ['Acknowledgement', 'acknowledgement'],
  ['Introduction', 'intro'],
  ['History', 'history'],
  ['Access', 'access'],
  ['Camping', 'camping'],
] as const

export function HeaderBlock({ header }: { header: Header }) {
  return (
    <header className="pb-4">
      <h1 className="border-b border-line pb-1 text-[28px] font-bold leading-tight text-navy">{header.name}</h1>
      <dl className="mt-4 space-y-1 text-[13px]">
        {FACTS.filter(([, key]) => header[key]).map(([label, key]) => (
          <div key={key} className="flex gap-2">
            <dt className="w-12 shrink-0 font-bold text-navy">{label}</dt>
            <dd>{header[key]}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 space-y-5">
        {SECTIONS.filter(([, key]) => header[key]).map(([label, key]) => (
          // Live site: label column on the left; stacked on phones.
          <section key={key} className="gap-6 sm:grid sm:grid-cols-[11rem_1fr]">
            <h2 className="mb-1 h-fit border-b border-line text-xl font-bold text-navy sm:mb-0">{label}</h2>
            <p className="text-[13px] leading-snug">
              <Lines text={header[key]} />
            </p>
          </section>
        ))}
      </div>
    </header>
  )
}
