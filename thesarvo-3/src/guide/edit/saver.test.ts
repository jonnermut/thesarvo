import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Guide, GuideNode, TextBlock } from '#/guide/model/types'
import type { Commit, GuideRepo, Stored } from '#/guide/save/repo'
import { saveGuide } from '#/guide/save/save'
import { SAVE_DEBOUNCE_MS, Saver } from './saver'
import type { SaveApi } from './saver'

vi.mock('#/auth/session', () => ({ getIdToken: () => Promise.resolve('t') }))

const text = (id: string, t = ''): TextBlock => ({ type: 'text', id, cls: 'text', text: t })
const guide = (...nodes: GuideNode[]): Guide => ({ id: '7', guideStars: '', nodes })
const edit = (g: Guide, id: string, t: string): Guide => ({ ...g, nodes: g.nodes.map((n) => (n.type === 'text' && n.id === id ? { ...n, text: t } : n)) })

class MemoryRepo implements GuideRepo {
  saves = 0
  constructor(public stored: Stored) {}
  read = () => Promise.resolve(this.stored)
  commit = (c: Commit) => {
    this.saves++
    this.stored = { head: `c${this.saves}`, guide: c.guide, history: c.history }
    return Promise.resolve(this.stored.head)
  }
}

/** The real save, on a repo in memory; `offline` makes it fail. */
const server = (start: Guide) => {
  const repo = new MemoryRepo({ head: 'c0', guide: start, history: [] })
  const state = { offline: false, repo }
  const api: SaveApi = {
    latest: () => Promise.resolve({ ok: true, value: { guide: repo.stored.guide } }),
    save: async (request) => {
      if (state.offline) return { ok: false, message: 'Offline' }
      const result = await saveGuide(repo, { sub: 's', email: 'e@x', name: 'Jon', groups: [] }, request)
      return result.status === 'missing' ? { ok: false, message: 'missing' } : { ok: true, value: result }
    },
  }
  return { api, state }
}

/** An editor: a saver and the guide it shows. */
const editor = async (api: SaveApi, published: Guide) => {
  const shown = { guide: published }
  const saver = new Saver('7', { rebase: (g) => (shown.guide = g), changed: () => {} }, api)
  shown.guide = await saver.load(published)
  const type = (g: Guide) => {
    shown.guide = g
    saver.update(g)
  }
  return { saver, shown, type }
}

const settle = () => vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS + 10)

describe('Saver', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  const start = guide(text('1', 'a'), text('2', 'b'))

  it('remembers what it saved, for the page to show until the site is rebuilt', async () => {
    localStorage.clear()
    const { api } = server(start)
    const { type } = await editor(api, start)
    type(edit(start, '1', 'changed'))
    await settle()
    const kept = JSON.parse(localStorage.getItem('thesarvo.justSaved') ?? '{}') as Record<string, { guide: Guide; at: string }>
    expect(kept['7'].guide).toEqual(edit(start, '1', 'changed'))
    expect(Date.parse(kept['7'].at)).not.toBeNaN()
  })

  it('saves a second after the last edit, starting from the latest version', async () => {
    const { api, state } = server(edit(start, '2', 'newer'))
    const { saver, shown, type } = await editor(api, start)
    expect(shown.guide).toEqual(edit(start, '2', 'newer'))
    type(edit(shown.guide, '1', 'x'))
    type(edit(shown.guide, '1', 'xy'))
    expect(saver.unsavedIds()).toEqual(new Set(['1']))
    await settle()
    expect(state.repo.saves).toBe(1)
    expect(state.repo.stored.guide).toEqual(guide(text('1', 'xy'), text('2', 'newer')))
    expect(saver.status).toEqual({ kind: 'saved' })
    expect(saver.hasUnsaved()).toBe(false)
  })

  it('brings others’ saves into the editor', async () => {
    const { api, state } = server(start)
    const { shown, type } = await editor(api, start)
    state.repo.stored = { ...state.repo.stored, guide: edit(start, '2', 'theirs') }
    type(edit(shown.guide, '1', 'mine'))
    await settle()
    expect(shown.guide).toEqual(guide(text('1', 'mine'), text('2', 'theirs')))
  })

  it('holds a block someone else changed until the editor chooses', async () => {
    const { api, state } = server(start)
    const a = await editor(api, start)
    state.repo.stored = { ...state.repo.stored, guide: edit(start, '1', 'theirs') }
    a.type(edit(edit(a.shown.guide, '1', 'mine'), '2', 'also'))
    await settle()
    expect([...a.saver.conflicts.keys()]).toEqual(['1'])
    expect(a.shown.guide).toEqual(guide(text('1', 'mine'), text('2', 'also')))
    await settle()
    // The rest saved; the held block did not.
    expect(state.repo.stored.guide).toEqual(guide(text('1', 'theirs'), text('2', 'also')))
    a.saver.resolve('1', 'mine')
    await settle()
    expect(state.repo.stored.guide).toEqual(guide(text('1', 'mine'), text('2', 'also')))
    expect(a.saver.conflicts.size).toBe(0)
  })

  it('can take theirs instead', async () => {
    const { api, state } = server(start)
    const a = await editor(api, start)
    state.repo.stored = { ...state.repo.stored, guide: edit(start, '1', 'theirs') }
    a.type(edit(a.shown.guide, '1', 'mine'))
    await settle()
    a.saver.resolve('1', 'theirs')
    await settle()
    expect(a.shown.guide).toEqual(edit(start, '1', 'theirs'))
    expect(a.saver.hasUnsaved()).toBe(false)
  })

  it('keeps retrying while offline', async () => {
    const { api, state } = server(start)
    const { saver, shown, type } = await editor(api, start)
    state.offline = true
    type(edit(shown.guide, '1', 'x'))
    await settle()
    expect(saver.status).toEqual({ kind: 'retrying', message: 'Offline' })
    state.offline = false
    await vi.advanceTimersByTimeAsync(2100)
    expect(saver.status).toEqual({ kind: 'saved' })
    expect(state.repo.stored.guide).toEqual(edit(start, '1', 'x'))
  })

  it('carries edits made while a save was on its way', async () => {
    const { api, state } = server(start)
    const { shown, type, saver } = await editor(api, start)
    let release = () => {}
    const save = api.save
    api.save = (r) => new Promise((done) => (release = () => void save(r).then(done)))
    type(edit(shown.guide, '1', 'x'))
    await settle()
    type(edit(shown.guide, '2', 'later'))
    release()
    api.save = save
    await settle()
    await settle()
    expect(shown.guide).toEqual(guide(text('1', 'x'), text('2', 'later')))
    expect(state.repo.stored.guide).toEqual(guide(text('1', 'x'), text('2', 'later')))
    expect(saver.hasUnsaved()).toBe(false)
  })

  it('only keeps drafts where saving is not set up', async () => {
    const api: SaveApi = { latest: () => Promise.resolve({ ok: false, unavailable: true, message: 'no' }), save: () => Promise.reject(new Error('never')) }
    const { saver, shown, type } = await editor(api, start)
    type(edit(shown.guide, '1', 'x'))
    await settle()
    expect(saver.status).toEqual({ kind: 'unavailable' })
    expect(saver.hasUnsaved()).toBe(true)
  })
})
