import { Link, useNavigate } from '@tanstack/react-router'
import { Fragment, lazy, Suspense,  useEffect, useMemo, useState } from 'react'
import type {ReactNode} from 'react';
import type { GuideStats } from '#/guide/content/manifest'
import { findByPath, flatten, guideUrl } from '#/guide/content/paths'
import type { IndexNode } from '#/guide/content/types'
import type { GpsPoint } from '#/guide/model/types'
import { fetchTree } from '#/guide/server'
import { LockMark } from '#/components/LockMark'
import { DownloadIcon } from './GpsBlock'
import { treeKmlUrl } from './kml'
import { rollup } from './rollup'
import { PROBLEM_BANDS, ROUTE_BANDS } from './routeStats'
import { useRotation } from './useRotation'

const MapView = lazy(() => import('#/guide/islands/MapView'))

/** Lowest grades lightest. */
const BAND_COLOURS = ['bg-forest/25', 'bg-forest/50', 'bg-forest/75', 'bg-forest']

/** Classics a card shows at once; it steps through its longer list. */
const SHOWN = 3

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`

/**
 * What lies beneath a page, replacing Confluence's contents macro: a card per child with its
 * size, grade spread and best climbs, and a map of the crags. Rendered with the stats the page was
 * built with, then refreshed from the manifest, so a change to one guide needs no rebuild here.
 */
/** `bare` leaves out the heading and totals, for the home page, whose hero says it. `after`, when given, is list items (cards) slotted in after the first child: the home page puts weather, what's new and the forum there. */
export function ContentsView({ node, after, bare }: { node: IndexNode; after?: ReactNode; bare?: boolean }) {
  const [fresh, setFresh] = useState<IndexNode>()
  useEffect(() => {
    let live = true
    fetchTree()
      .then((tree) => live && setFresh(findByPath(tree, node.path)))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [node.path])
  // The last page's fresh tree stays in state until this page's arrives.
  const current = fresh?.path === node.path ? fresh : node
  const below = useMemo(() => flatten(current).slice(1), [current])
  if (!current.children.length) return null

  // Totals come with the tree; `below` may stop short of the deepest pages until the manifest arrives.
  const own = current.stats?.total ? 1 : 0
  const total = (current.count ?? 0) - (current.stats?.total ?? 0)
  const guides = (current.guides ?? 0) - own
  const withStats = below.filter((n) => n.stats?.total)
  const boulders = withStats.length > 0 && withStats.every((n) => n.stats!.problems)
  const legends = [...new Set(withStats.map((n) => n.stats!.problems))]

  return (
    <section aria-label="Contents" className={`space-y-4 ${bare ? 'mt-6' : 'mt-10'}`}>
      {!bare && (
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-line">
        <h2 className="text-2xl font-bold text-navy">
          {current.isGuide ? 'Also here' : 'Contents'}
        </h2>
        {total > 0 && (
          <p className="text-sm text-muted">
            {plural(total, boulders ? 'problem' : 'climb')} in {plural(guides, 'guide')}
          </p>
        )}
      </div>
      )}
      {legends.length > 0 && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted">
          {legends.map((problems) => (
            <BandLegend key={String(problems)} labels={problems ? PROBLEM_BANDS : ROUTE_BANDS} />
          ))}
        </div>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">
        {current.children.map((child, i) => (
          <Fragment key={child.id}>
            <li className="min-w-0">
              <Card node={child} />
            </li>
            {i === 0 && after}
          </Fragment>
        ))}
      </ul>
      <CragMap id={current.id} nodes={below} />
    </section>
  )
}

function BandLegend({ labels }: { labels: readonly string[] }) {
  return (
    <span className="flex items-center gap-2">
      {labels.map((label, i) => (
        <span key={label} className="flex items-center gap-1">
          <span className={`inline-block size-2.5 rounded-sm ${BAND_COLOURS[i]}`} aria-hidden />
          {label}
        </span>
      ))}
    </span>
  )
}

function Card({ node }: { node: IndexNode }) {
  const s = node.stats
  // A region has no climbs of its own: show its guides added up.
  const sum = useMemo(() => (s ? undefined : rollup(node)), [node, s])
  const classics = s ? s.classics.map((c) => [node, c] as const) : (sum?.classics ?? [])
  const [seconds] = useState(() => 7 + Math.random() * 4)
  const { at, hold } = useRotation(Math.ceil(classics.length / SHOWN), seconds)
  // The three on show step through the longer list; wrapping fills the last page.
  const shown = classics.length <= SHOWN ? classics : Array.from({ length: SHOWN }, (_, k) => classics[(at * SHOWN + k) % classics.length])
  return (
    // The title link stretches over the whole card; the climb and child links sit above it.
    <div className="card card-link relative h-full p-3" {...hold}>
      <div className="flex items-baseline justify-between gap-3">
        <Link to={guideUrl(node)} className="text-[17px] font-semibold text-link after:absolute after:inset-0 hover:underline">
          {node.title}
          {node.private && <LockMark className="ml-1.5 align-[-1px]" />}
        </Link>
        {!!node.count && <span className="shrink-0 text-[13px] text-muted tabular-nums">{node.count.toLocaleString()}</span>}
      </div>
      {s && s.total > 0 && <Summary stats={s} gps={s.gps ? 'GPS' : undefined} />}
      {sum && <Summary stats={sum} />}
      {classics.length > 0 && (
        <ul className="relative mt-2 space-y-0.5 text-[13px]">
          {shown.map(([guide, [anchor, name, grade, stars]]) => (
            <li key={`${guide.id}${anchor}`}>
              <Link to={guideUrl(guide)} hash={anchor} className="flex gap-1.5 hover:text-link">
                <span className="w-9 shrink-0 text-amber-deep">{'★'.repeat(stars)}</span>
                <span className="min-w-0 truncate">
                  {name}
                  {guide !== node && <span className="text-muted"> · {guide.title}</span>}
                </span>
                <span className="text-muted">{grade}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!!s?.sections && (
        <p className="relative mt-2 text-[13px] leading-relaxed text-muted">
          {s.sections.map(([anchor, text], i) => (
            <span key={anchor}>
              {i > 0 && ', '}
              <Link to={guideUrl(node)} hash={anchor} className="text-link hover:underline">
                {text}
              </Link>
            </span>
          ))}
        </p>
      )}
      {node.children.length > 0 && (
        <p className="relative mt-2 text-[13px] leading-relaxed text-muted">
          {node.children.map((c, i) => (
            <span key={c.id}>
              {i > 0 && ', '}
              <Link to={guideUrl(c)} className="text-link hover:underline">
                {c.title}
              </Link>
              {c.private && <LockMark className="ml-1 align-[-1px]" />}
            </span>
          ))}
        </p>
      )}
      {!s && !node.children.length && <p className="mt-1 text-[13px] text-muted">Information</p>}
    </div>
  )
}

function Summary({ stats, gps }: { stats: Pick<GuideStats, 'problems' | 'bands' | 'stars' | 'sport' | 'topos'>; gps?: string }) {
  const labels = stats.problems ? PROBLEM_BANDS : ROUTE_BANDS
  const graded = stats.bands.reduce((a, b) => a + b, 0)
  const facts = [
    stats.stars[2] > 0 && `★★★ ${stats.stars[2]}`,
    stats.stars[1] > 0 && `★★ ${stats.stars[1]}`,
    stats.sport > 0 && `${stats.sport} sport`,
    stats.topos > 0 && plural(stats.topos, 'topo'),
    gps,
  ].filter(Boolean)
  return (
    <div className="mt-2 space-y-1.5">
      {graded > 0 && (
        <div className="flex h-2 overflow-hidden rounded-full bg-paper" role="img" aria-label={labels.map((l, i) => `${l}: ${stats.bands[i]}`).join(', ')}>
          {stats.bands.map((n, i) =>
            n ? <span key={labels[i]} title={`${labels[i]}: ${n}`} className={BAND_COLOURS[i]} style={{ width: `${(n / graded) * 100}%` }} /> : null,
          )}
        </div>
      )}
      {facts.length > 0 && <p className="flex flex-wrap gap-x-3 text-[12px] text-muted">{facts.map((f) => <span key={String(f)}>{f}</span>)}</p>}
    </div>
  )
}

/**
 * One pin per guide that has GPS; clicking a pin opens that guide. Only in the browser. The build
 * writes every point below as one KML file, as the old site's recursive export did.
 */
function CragMap({ id, nodes }: { id: string; nodes: IndexNode[] }) {
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const key = nodes.map((n) => n.stats?.pin && `${n.path}@${n.stats.pin.join(',')}`).filter(Boolean).join(' ')
  const points = useMemo(
    (): GpsPoint[] =>
      nodes.flatMap((n) => {
        const pin = n.stats?.pin
        return pin
          ? [{ pid: n.path, code: '', description: n.title, zone: '', easting: '', northing: '', latitude: String(pin[0]), longitude: String(pin[1]), height: '' }]
          : []
      }),
    [key],
  )
  if (points.length < 2 || !mounted) return null
  return (
    <div className="no-print pt-2">
      <Suspense fallback={<div className="grid h-80 place-items-center rounded-lg bg-black/5 text-muted">Loading map…</div>}>
        {/* Keyed on the pins so another page's map fits its own crags. */}
        <MapView key={key} points={points} lines={[]} onSelect={(path) => void navigate({ to: guideUrl({ path }) })} />
      </Suspense>
      <a
        href={treeKmlUrl(id)}
        download
        title="Every GPS point below this page, for Google Earth and other GPS apps"
        className="mt-1 inline-flex items-center gap-1 text-[13px] text-muted hover:text-link"
      >
        <DownloadIcon />
        KML of all GPS points
      </a>
    </div>
  )
}
