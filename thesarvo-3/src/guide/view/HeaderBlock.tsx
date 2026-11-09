import type { Header } from '#/guide/model/types'
import { RockIcon, SunIcon, WalkIcon } from './FactIcons'
import { RoutesChart } from './RoutesChart'
import type { RouteStats } from './routeStats'
import { Lines } from './text'
import { InlineCredit } from './credit'
import { Callout, RichHtml } from './RichHtml'
import { isRich, stripTags } from './richText'
import { StewardNote } from './StewardNote'

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
      {header.notices?.some((n) => stripTags(n.html)) && (
        <div className="mt-4 space-y-2">
          {header.notices.filter((n) => stripTags(n.html)).map((n, i) => (
            <Callout key={i} kind={n.kind}>
              <RichHtml html={n.html} />
            </Callout>
          ))}
        </div>
      )}
      <div className="mt-6 space-y-5">
        {SECTIONS.filter(([, key]) => header[key] || (key === 'steward' && header.stewardEmail)).map(([label, key]) => (
          // Live site: label column on the left; stacked on phones.
          // Labels are single words: never broken inside one ("Acknowledgemen/t") by the article's wrapping.
          <section key={key} className="gap-6 sm:grid sm:grid-cols-[13rem_1fr]">
            <h2 className="mb-1 h-fit border-b border-line text-xl font-bold text-navy wrap-normal sm:mb-0">{label}</h2>
            <div className="text-[13px] leading-relaxed break-words sm:text-justify sm:hyphens-auto">
              {key === 'steward' && header.stewardEmail && !header.steward ? (
                <StewardNote email={header.stewardEmail} />
              ) : isRich(header, key) ? (
                <RichHtml html={header[key] ?? ''} />
              ) : (
                <p>
                  <Lines text={header[key] ?? ''} />
                </p>
              )}
              <InlineCredit other={header.other} part={key} what={label} />
            </div>
          </section>
        ))}
      </div>
    </header>
  )
}
