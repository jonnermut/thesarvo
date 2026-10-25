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
    <header className="border-b border-line pb-8">
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{header.name}</h1>
      <dl className="mt-5 flex flex-wrap gap-2">
        {FACTS.filter(([, key]) => header[key]).map(([label, key]) => (
          <div key={key} className="rounded-full bg-forest px-3.5 py-1.5 text-sm text-white">
            <dt className="mr-1.5 inline text-white/60">{label}</dt>
            <dd className="inline">{header[key]}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-8 space-y-6">
        {SECTIONS.filter(([, key]) => header[key]).map(([label, key]) => (
          <section key={key}>
            <h2 className="font-display text-xl font-semibold text-forest">{label}</h2>
            <p className="mt-1.5 leading-relaxed text-ink/85">
              <Lines text={header[key]} />
            </p>
          </section>
        ))}
      </div>
    </header>
  )
}
