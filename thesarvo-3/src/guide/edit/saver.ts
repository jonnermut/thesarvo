import type { Guide } from '#/guide/model/types'
import { getIdToken } from '#/auth/session'
import { GUIDE_PREFIX } from '#/guide/content/paths'
import { diffGuides, ensureIds, isEmpty, mergeChanges, nodeKeys, nodesByKey, renameChanges, same } from '#/guide/save/changes'
import type { Changes, Conflict } from '#/guide/save/changes'
import { rememberSaved } from '#/guide/justSaved'
import type { SaveResult } from '#/guide/save/save'

/** What the server said, as far as the saver cares. */
export type Answer<T> = { ok: true; value: T } | { ok: false; unavailable?: boolean; message: string }

export interface SaveApi {
  latest: (guideId: string) => Promise<Answer<{ guide: Guide }>>
  save: (request: { guide: string; session: string; changes: Changes; note?: string }) => Promise<Answer<Exclude<SaveResult, { status: 'missing' }>>>
}

const call = async <T>(path: string, init: RequestInit = {}): Promise<Answer<T>> => {
  const token = await getIdToken()
  if (!token) return { ok: false, message: 'Sign in again to save' }
  try {
    const res = await fetch(`${GUIDE_PREFIX}/api/${path}`, { ...init, headers: { ...init.headers, authorization: `Bearer ${token}`, 'content-type': 'application/json' } })
    const body = (await res.json().catch(() => ({}))) as T & { error?: string }
    // 409 is a conflict, which the body describes.
    if (res.ok || res.status === 409) return { ok: true, value: body }
    return { ok: false, unavailable: res.status === 501, message: body.error ?? `Saving failed (${res.status})` }
  } catch {
    return { ok: false, message: 'Offline' }
  }
}

export const serverApi: SaveApi = {
  latest: (id) => call(`guide?id=${encodeURIComponent(id)}`),
  save: (request) => call('save', { method: 'POST', body: JSON.stringify(request) }),
}

export type SaveStatus =
  | { kind: 'loading' }
  | { kind: 'saved' }
  | { kind: 'saving' }
  /** Not saved yet; kept in this browser and tried again. */
  | { kind: 'retrying'; message: string }
  /** No saving here (the static beta, or a server without a content repo): drafts in this browser only. */
  | { kind: 'unavailable' }

/** Edits after this long without a save start a new session, so a new entry in the guide's history. */
export const SESSION_IDLE_MS = 30 * 60_000
export const SAVE_DEBOUNCE_MS = 1000
const RETRY_MS = [2000, 5000, 15_000, 30_000, 60_000]

export const newSession = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`)

type Hooks = {
  /** The guide being edited has to change: others' saves came in, or the server renumbered or renamed something. */
  rebase: (guide: Guide) => void
  /** Status, conflicts or unsaved blocks changed. */
  changed: () => void
}

/**
 * Saves an editor's work as it goes: a second after the last edit it sends what changed since the last save, then
 * brings the server's merged guide back into the editor. Blocks someone else changed meanwhile are held as conflicts
 * until the editor keeps theirs or the other person's. Failed saves are retried; the browser draft covers the gap.
 */
export class Saver {
  status: SaveStatus = { kind: 'loading' }
  /** The guide as the server last had it. */
  saved: Guide | null = null
  conflicts = new Map<string, Conflict>()
  private present: Guide | null = null
  private inFlight = false
  private timer: ReturnType<typeof setTimeout> | undefined
  private failures = 0
  private session = newSession()
  private lastSave = 0

  constructor(
    private readonly guideId: string,
    private readonly hooks: Hooks,
    private readonly api: SaveApi = serverApi,
    private readonly now = Date.now,
  ) {}

  /** Loads the latest version: the one to edit. Falls back to `guide` (the published one) where saving is not set up. */
  async load(guide: Guide): Promise<Guide> {
    const latest = await this.api.latest(this.guideId)
    this.saved = latest.ok ? ensureIds(latest.value.guide) : ensureIds(guide)
    this.status = latest.ok ? { kind: 'saved' } : latest.unavailable ? { kind: 'unavailable' } : { kind: 'retrying', message: latest.message }
    this.hooks.changed()
    return this.saved
  }

  /** Starts from a draft left in this browser: its changes since `base` are saved like any others. */
  restore(base: Guide) {
    this.saved = base
  }

  /** The editor's guide changed. */
  update(present: Guide) {
    this.present = present
    if (this.status.kind !== 'unavailable') this.schedule(SAVE_DEBOUNCE_MS)
  }

  /** Changes not saved yet, without the held conflicts. */
  unsaved(): Changes {
    if (!this.saved || !this.present) return { nodes: [] }
    const changes = diffGuides(this.saved, this.present)
    return { ...changes, nodes: changes.nodes.filter((c) => !this.conflicts.has(c.id)) }
  }

  /** Ids of blocks with changes not saved yet. */
  unsavedIds = () => new Set(this.unsaved().nodes.map((c) => c.id))

  hasUnsaved = () => !!this.saved && !!this.present && !same(this.saved, this.present)

  /** Settles a conflict: keep this editor's block (saved over theirs next), or take theirs. */
  resolve(id: string, keep: 'mine' | 'theirs') {
    const conflict = this.conflicts.get(id)
    if (!conflict || !this.present || !this.saved) return
    this.conflicts.delete(id)
    if (keep === 'theirs') {
      // Theirs goes where they have it: after the block before it in the saved guide.
      const order = nodeKeys(this.present).filter((k) => k !== id)
      const theirOrder = nodeKeys(this.saved)
      const previous = theirOrder.slice(0, theirOrder.indexOf(id)).findLast((k) => order.includes(k))
      if (conflict.theirs) order.splice(previous === undefined ? 0 : order.indexOf(previous) + 1, 0, id)
      const node = nodesByKey(this.present).get(id) ?? null
      this.rebaseTo(mergeChanges(this.present, { nodes: [{ id, before: node, after: conflict.theirs }], order: { before: nodeKeys(this.present), after: order } }, true).guide)
    }
    this.hooks.changed()
    this.schedule(0)
  }

  /** Tries now, after a failure (the browser came back online, say). */
  retry = () => {
    if (this.status.kind === 'retrying') this.schedule(0)
  }

  stop() {
    clearTimeout(this.timer)
  }

  private schedule(ms: number) {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.send(), ms)
  }

  private rebaseTo(guide: Guide) {
    if (this.present && same(guide, this.present)) return
    this.present = guide
    this.hooks.rebase(guide)
  }

  private async send() {
    if (this.inFlight || !this.saved || !this.present) return
    const changes = this.unsaved()
    if (isEmpty(changes)) {
      if (this.status.kind !== 'saved' && this.status.kind !== 'unavailable') {
        this.status = { kind: 'saved' }
        this.hooks.changed()
      }
      return
    }
    if (this.now() - this.lastSave > SESSION_IDLE_MS && this.lastSave) this.session = newSession()
    const [base, sent] = [this.saved, this.present]
    this.inFlight = true
    this.status = { kind: 'saving' }
    this.hooks.changed()
    const answer = await this.api.save({ guide: this.guideId, session: this.session, changes })
    this.inFlight = false
    if (!answer.ok) {
      this.status = answer.unavailable ? { kind: 'unavailable' } : { kind: 'retrying', message: answer.message }
      this.hooks.changed()
      if (!answer.unavailable) this.schedule(RETRY_MS[Math.min(this.failures++, RETRY_MS.length - 1)])
      return
    }
    this.failures = 0
    this.lastSave = this.now()
    const result = answer.value
    const latest = this.present
    this.saved = result.guide
    if (result.status === 'saved' && result.at) rememberSaved(result.guide, result.at)
    // What to carry over onto the server's guide: edits made while saving, or on a conflict, everything.
    if (result.status === 'conflict') for (const c of result.conflicts) this.conflicts.set(c.id, c)
    const pending = result.status === 'saved' ? renameChanges(diffGuides(sent, latest), result.rename) : diffGuides(base, latest)
    // Held blocks stay as this editor has them until settled.
    const mine = nodesByKey(latest)
    const theirs = nodesByKey(result.guide)
    for (const id of this.conflicts.keys())
      if (!pending.nodes.some((c) => c.id === id)) pending.nodes.push({ id, before: theirs.get(id) ?? null, after: mine.get(id) ?? null })
    this.rebaseTo(mergeChanges(result.guide, pending, true).guide)
    this.status = { kind: 'saved' }
    this.hooks.changed()
    if (!isEmpty(this.unsaved())) this.schedule(SAVE_DEBOUNCE_MS)
  }
}
