import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useUser } from '#/auth/session'
import { Avatar } from '#/guide/avatars/Avatar'
import { guideUrl } from '#/guide/content/paths'
import type { IndexNode } from '#/guide/content/types'
import type { Climb, Guide, GuideNode } from '#/guide/model/types'
import { fetchHistory } from '#/guide/server'
import { diffGuides, ensureIds, isEmpty, mergeChanges, nodesByKey } from '#/guide/save/changes'
import type { Changes } from '#/guide/save/changes'
import { label, movedIds } from '#/guide/save/history'
import type { HistoryEntry } from '#/guide/save/history'
import { Topo } from '#/guide/view/Topo'
import { fieldDiffs, wordDiff } from './diff'
import { undoChanges, versionAfter } from './versions'

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const when = (iso: string) => new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const day = (iso: string) => new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
const climbsOf = (nodes: GuideNode[]) => new Map(nodes.flatMap((n): [string, Climb][] => (n.type === 'climb' || n.type === 'problem' ? [[n.id, n]] : [])))

/**
 * `/g/<page>?history`: the page's edit sessions, newest first, each with its changes on demand. `#<session>` opens
 * that one (What's New links here). Everything shown comes from the page's history file as the saves wrote it.
 */
export default function HistoryView({ node, guide, hash }: { node: IndexNode; guide: Guide | null; hash: string }) {
  const [history, setHistory] = useState<HistoryEntry[] | null | 'error'>(null)
  useEffect(() => {
    let live = true
    fetchHistory(node.id).then(
      (h) => live && setHistory(h),
      () => live && setHistory('error'),
    )
    return () => {
      live = false
    }
  }, [node.id])

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      {/* React puts it in the head: the list is for people, not search results. */}
      <meta name="robots" content="noindex" />
      <h1 className="border-b border-line text-[28px] font-bold text-navy">History</h1>
      <p className="mt-2 text-sm text-muted">
        Changes made to <Link to={guideUrl(node)} className="text-link hover:underline">{node.title}</Link>, newest first. Edits made on Confluence, the old site, are imported (the oldest are summed up in one entry).
      </p>
      {history === null ? (
        <p className="mt-6 text-muted">Loading…</p>
      ) : history === 'error' ? (
        <p className="mt-6">The history could not be loaded. Try again later.</p>
      ) : !history.length ? (
        <p className="mt-6">No changes yet.</p>
      ) : (
        <ol className="mt-6 space-y-3">
          {history.toReversed().map((e, i) => (
            <Entry key={e.session} entry={e} latest={i === 0} open={hash === e.session} guide={guide} history={history} />
          ))}
        </ol>
      )}
    </div>
  )
}

function Entry({ entry, latest, open: opened, guide, history }: { entry: HistoryEntry; latest: boolean; open: boolean; guide: Guide | null; history: HistoryEntry[] }) {
  const [open, setOpen] = useState(opened)
  const [action, setAction] = useState<'revert' | 'restore' | null>(null)
  const user = useUser()
  const box = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (opened) box.current?.scrollIntoView({ block: 'start' })
  }, [opened])
  const span = day(entry.start) === day(entry.end) ? when(entry.end) : `${day(entry.start)} – ${when(entry.end)}`
  return (
    <li ref={box} id={entry.session} className="scroll-mt-20 rounded-lg border border-black/10 bg-card p-4">
      <div className="font-medium">{capital(entry.description)}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
        <Avatar ids={[entry.user.sub]} name={entry.user.name} className="size-5 text-[10px]" />
        <span>
          {entry.user.name || 'Someone'} · <time dateTime={entry.end}>{span}</time>
        </span>
      </div>
      {entry.note && <p className="mt-1 text-sm italic">{entry.note}</p>}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="text-link hover:underline">
          {open ? 'Hide changes' : 'Show changes'}
        </button>
        {user?.admin && guide && (
          <>
            <button type="button" onClick={() => setAction('revert')} className="text-link hover:underline">
              Revert this session
            </button>
            {!latest && (
              <button type="button" onClick={() => setAction('restore')} className="text-link hover:underline">
                Restore this version
              </button>
            )}
          </>
        )}
      </div>
      {open && <ChangeList changes={entry} guideId={guide?.id ?? ''} climbs={climbsOf([...(guide?.nodes ?? []), ...Object.values(entry.nodes).flatMap((n) => n.after ?? [])])} />}
      {action && guide && <AdminAction key={action} kind={action} entry={entry} guide={guide} history={history} onClose={() => setAction(null)} />}
    </li>
  )
}

/** A session's changes, or a planned save's: each block with what changed in it, then blocks that moved. */
function ChangeList({ changes, guideId, climbs, names }: { changes: Pick<HistoryEntry, 'nodes' | 'order' | 'guideStars'>; guideId: string; climbs: Map<string, Climb>; names?: Map<string, GuideNode> }) {
  const moved = changes.order ? movedIds(changes.order.before, changes.order.after).flatMap((id) => changes.nodes[id]?.after ?? names?.get(id) ?? []) : []
  return (
    <div className="mt-3 space-y-3 border-t border-black/10 pt-3">
      {changes.guideStars && <Row field="Guide stars" before={changes.guideStars.before} after={changes.guideStars.after} long={false} />}
      {Object.entries(changes.nodes).map(([id, { before, after }]) => (
        <Block key={id} before={before} after={after} guideId={guideId} climbs={climbs} />
      ))}
      {moved.length > 0 && <p className="text-sm">Moved {moved.map(label).join(', ')}</p>}
    </div>
  )
}

function Block({ before, after, guideId, climbs }: { before: GuideNode | null; after: GuideNode | null; guideId: string; climbs: Map<string, Climb> }) {
  const node = after ?? before
  if (!node) return null
  const [tag, colour] = !before ? ['Added', 'bg-green-100 text-green-900'] : !after ? ['Deleted', 'bg-red-100 text-red-900'] : ['Changed', 'bg-black/5 text-ink']
  const fields = fieldDiffs(before, after)
  // Only the legend's words changed: one picture says it.
  const redrawn = fields.some((f) => ['Image', 'Lines', 'Labels', 'Drawing'].includes(f.field))
  const pictures = (redrawn ? [before, after] : [null, after]).flatMap((n, i) => (n?.type === 'image' ? [{ topo: n, caption: i ? 'After' : 'Before' }] : []))
  return (
    <section>
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${colour}`}>{tag}</span>
        {capital(label(node))}
      </h3>
      {pictures.length > 0 && guideId && (
        <div className={`mt-2 grid gap-2 ${pictures.length > 1 ? 'sm:grid-cols-2' : 'max-w-md'}`}>
          {pictures.map(({ topo, caption }) => (
            <figure key={caption}>
              {pictures.length > 1 && <figcaption className="mb-1 text-xs text-muted">{caption}</figcaption>}
              <Topo guideId={guideId} topo={topo} climbs={climbs} active={null} onActive={() => undefined} />
            </figure>
          ))}
        </div>
      )}
      <dl className="mt-1 space-y-1">
        {fields.map((f) => (
          <Row key={f.field} {...f} />
        ))}
      </dl>
    </section>
  )
}

function Row({ field, before, after, long }: { field: string; before: string; after: string; long: boolean }) {
  return (
    <div className="grid gap-x-3 text-sm sm:grid-cols-[9rem_1fr]">
      <dt className="text-muted">{field}</dt>
      <dd className="min-w-0 break-words whitespace-pre-wrap">
        {long ? (
          wordDiff(before, after).map((p, i) =>
            p.op === 'same' ? <span key={i}>{p.text}</span> : p.op === 'add' ? <ins key={i} className="bg-green-100 text-green-900 no-underline">{p.text}</ins> : <del key={i} className="bg-red-100 text-red-900">{p.text}</del>,
          )
        ) : (
          <>
            {before && <del className="bg-red-100 text-red-900">{before}</del>}
            {before && after && ' → '}
            {after && <ins className="bg-green-100 text-green-900 no-underline">{after}</ins>}
          </>
        )}
      </dd>
    </div>
  )
}

type Plan = { latest: Guide; changes: Changes; target: Guide; conflicts: number }
type Step = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'preview'; plan: Plan } | { kind: 'saving'; plan: Plan } | { kind: 'done' }

/**
 * Admins only: undo a session, or put the guide back as a session left it. Both are ordinary saves of the difference
 * between the guide now and the result, previewed first, so they show in the history like any other edit.
 */
function AdminAction({ kind, entry, guide, history, onClose }: { kind: 'revert' | 'restore'; entry: HistoryEntry; guide: Guide; history: HistoryEntry[]; onClose: () => void }) {
  const [step, setStep] = useState<Step>({ kind: 'loading' })
  const [anyway, setAnyway] = useState(false)
  useEffect(() => {
    let live = true
    void (async () => {
      // Admins only, so loaded only for them.
      const { serverApi } = await import('#/guide/edit/saver')
      const latest = await serverApi.latest(guide.id)
      if (!live) return
      if (!latest.ok) return setStep({ kind: 'error', message: latest.message })
      const now = latest.value.guide
      let target: Guide | null
      let conflicts = 0
      if (kind === 'revert') {
        const merged = mergeChanges(now, undoChanges(entry), anyway)
        target = merged.guide
        conflicts = merged.conflicts.length
      } else {
        // The page and its history file are built together, so they agree: work back from the page, not the latest save.
        target = versionAfter(ensureIds(guide), history, entry.session)
      }
      if (!target) return setStep({ kind: 'error', message: 'That version could not be worked out.' })
      setStep({ kind: 'preview', plan: { latest: now, changes: diffGuides(now, target), target, conflicts } })
    })()
    return () => {
      live = false
    }
  }, [kind, entry, guide, history, anyway])

  const save = async (plan: Plan) => {
    setStep({ kind: 'saving', plan })
    const note = kind === 'revert' ? `Reverted ${entry.user.name || 'someone'}’s changes of ${when(entry.end)}` : `Restored the version of ${when(entry.end)}`
    const { newSession, serverApi } = await import('#/guide/edit/saver')
    const res = await serverApi.save({ guide: guide.id, session: newSession(), changes: plan.changes, note })
    if (!res.ok) return setStep({ kind: 'error', message: res.message })
    if (res.value.status === 'conflict') return setStep({ kind: 'error', message: 'Someone saved this guide meanwhile. Close this and try again.' })
    setStep({ kind: 'done' })
  }

  const title = kind === 'revert' ? 'Revert this session' : 'Restore this version'
  return (
    <div className="mt-3 rounded-md border border-amber/60 bg-amber/5 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <button type="button" onClick={onClose} className="rounded px-2 py-1 text-link hover:bg-black/5">
          Close
        </button>
      </div>
      {step.kind === 'loading' && <p className="mt-2 text-muted">Working out the changes…</p>}
      {step.kind === 'error' && <p className="mt-2">{step.message}</p>}
      {step.kind === 'done' && <p className="mt-2">Saved. The page and this list show it after the site is next rebuilt.</p>}
      {(step.kind === 'preview' || step.kind === 'saving') && (
        <>
          {step.plan.conflicts > 0 && (
            <p className="mt-2">
              {step.plan.conflicts === 1 ? 'One block was' : `${step.plan.conflicts} blocks were`} changed again since, so {step.plan.conflicts === 1 ? 'it stays' : 'they stay'} as now.{' '}
              <button type="button" onClick={() => setAnyway(true)} className="text-link hover:underline">
                Revert {step.plan.conflicts === 1 ? 'it' : 'them'} anyway
              </button>
            </p>
          )}
          {isEmpty(step.plan.changes) ? (
            <p className="mt-2">{step.plan.conflicts ? 'Nothing else to change.' : 'Nothing to change: the guide is already like this.'}</p>
          ) : (
            <>
              <p className="mt-2">This saves these changes to the guide as it is now:</p>
              <ChangeList
                changes={{ ...step.plan.changes, nodes: Object.fromEntries(step.plan.changes.nodes.map((c) => [c.id, { before: c.before, after: c.after }])) }}
                guideId={guide.id}
                climbs={climbsOf([...step.plan.latest.nodes, ...step.plan.target.nodes])}
                names={nodesByKey(step.plan.target)}
              />
              <button
                type="button"
                disabled={step.kind === 'saving'}
                onClick={() => void save(step.plan)}
                className="mt-3 rounded-md bg-navy px-3 py-1.5 font-medium text-white hover:bg-navy/90 disabled:opacity-60"
              >
                {step.kind === 'saving' ? 'Saving…' : title}
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}
