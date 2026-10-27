import type { Header } from '#/guide/model/types'
import { RockIcon, SunIcon, WalkIcon } from './FactIcons'
import { RoutesChart } from './RoutesChart'
import type { RouteStats } from './routeStats'
import { Lines } from './text'

const FACTS = [
  [WalkIcon, 'walk'],
  [SunIcon, 'sun'],
  [RockIcon, 'rock'],
] as const

const SECTIONS = [
  ['Acknowledgement', 'acknowledgement'],
  ['Introduction', 'intro'],
  ['History', 'history'],
  ['Access', 'access'],
  ['Camping', 'camping'],
  ['Crag Steward', 'steward'],
] as const

export function HeaderBlock({ header, stats }: { header: Header; stats: RouteStats }) {
  return (
    <header className="pb-4">
      <h1 className="border-b border-line pb-1 text-[28px] font-bold leading-tight text-navy">{header.name}</h1>
      <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-4">
        {stats.total > 0 && <RoutesChart stats={stats} />}
        <ul className="space-y-2 text-[13px]">
          {FACTS.filter(([, key]) => header[key]).map(([Icon, key]) => (
            <li key={key} className="flex items-center gap-2">
              <Icon />
              {header[key]}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6 space-y-5">
        {SECTIONS.filter(([, key]) => header[key]).map(([label, key]) => (
          // Live site: label column on the left; stacked on phones.
          // Labels are single words: never broken inside one ("Acknowledgemen/t") by the article's wrapping.
          <section key={key} className="gap-6 sm:grid sm:grid-cols-[13rem_1fr]">
            <h2 className="mb-1 h-fit border-b border-line text-xl font-bold text-navy wrap-normal sm:mb-0">{label}</h2>
            <p className="text-[13px] leading-snug break-words">
              <Lines text={header[key] ?? ''} />
            </p>
          </section>
        ))}
      </div>
    </header>
  )
}
