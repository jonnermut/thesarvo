import { describe, expect, it } from 'vitest'
import { addComment, createThread, listThreads, readThread, recentThreads, Refused, setHidden } from './service'
import type { Viewer } from './service'
import type { ForumStore } from './store'
import type { Thread, ThreadMeta } from './types'

/** An in-memory store with the same tag rules as S3's conditional writes. */
function memory(seed: Record<string, unknown> = {}) {
  const files = new Map<string, { text: string; n: number }>(Object.entries(seed).map(([k, v]) => [k, { text: JSON.stringify(v), n: 1 }]))
  const store: ForumStore & { files: typeof files; beforeWrite?: () => void } = {
    files,
    async read(name) {
      const f = files.get(name)
      return f ? { value: JSON.parse(f.text) as unknown, tag: String(f.n) } : null
    },
    async write(name, value, tag) {
      store.beforeWrite?.()
      const f = files.get(name)
      if ((f ? String(f.n) : null) !== tag) return false
      files.set(name, { text: JSON.stringify(value), n: (f?.n ?? 0) + 1 })
      return true
    },
  }
  return store
}

const ann: Viewer = { sub: 'a', name: 'Ann', groups: [], admin: false }
const bob: Viewer = { sub: 'b', name: 'Bob', groups: ['cct-members'], admin: false }
const root: Viewer = { sub: 'r', name: 'Root', groups: ['admins'], admin: true }

describe('forum', () => {
  it('creates a thread, lists it first and puts it in the home feed', async () => {
    const store = memory()
    const t = await createThread(store, ann, { title: ' Hello ', text: 'First\r\npost' })
    expect(t).toMatchObject({ title: 'Hello', text: 'First\npost', author: { sub: 'a', name: 'Ann' }, comments: [] })
    expect((await listThreads(store, ann)).map((m) => m.id)).toEqual([t.id])
    expect(await recentThreads(store)).toMatchObject([{ id: t.id, comments: 0 }])
    expect(JSON.stringify(await recentThreads(store))).not.toContain('First')
  })

  it('refuses empty and over-long input', async () => {
    const store = memory()
    await expect(createThread(store, ann, { title: '', text: 'x' })).rejects.toBeInstanceOf(Refused)
    await expect(createThread(store, ann, { title: 'x', text: 'y'.repeat(10_001) })).rejects.toThrow('too long')
  })

  it('adds comments and replies, counts them, and moves the thread up the list', async () => {
    const store = memory()
    const a = await createThread(store, ann, { title: 'A', text: 'a' }, new Date('2026-01-01T00:00:00Z'))
    const b = await createThread(store, ann, { title: 'B', text: 'b' }, new Date('2026-01-02T00:00:00Z'))
    const t1 = await addComment(store, bob, { thread: a.id, text: 'hi' }, new Date('2026-01-03T00:00:00Z'))
    await addComment(store, ann, { thread: a.id, parent: t1.comments[0].id, text: 'reply' }, new Date('2026-01-04T00:00:00Z'))
    const list = await listThreads(store, ann)
    expect(list.map((m) => [m.id, m.comments])).toEqual([[a.id, 2], [b.id, 0]])
    await expect(addComment(store, ann, { thread: a.id, parent: 'nope', text: 'x' })).rejects.toThrow('gone')
    await expect(addComment(store, ann, { thread: 'missing', text: 'x' })).rejects.toThrow('No such post')
  })

  it('ignores a double-posted comment', async () => {
    const store = memory()
    const t = await createThread(store, ann, { title: 'A', text: 'a' })
    await addComment(store, ann, { thread: t.id, text: 'same' })
    expect((await addComment(store, ann, { thread: t.id, text: 'same' })).comments).toHaveLength(1)
  })

  it('retries when someone else writes first', async () => {
    const store = memory()
    const t = await createThread(store, ann, { title: 'A', text: 'a' })
    let raced = false
    store.beforeWrite = () => {
      if (raced) return
      raced = true
      const f = store.files.get(`threads/${t.id}.json`)!
      const cur = JSON.parse(f.text) as Thread
      store.files.set(`threads/${t.id}.json`, { text: JSON.stringify({ ...cur, comments: [{ id: 'x', parent: null, author: { sub: 'z', name: 'Zed' }, at: '2026-01-01T00:00:00Z', text: 'first' }] }), n: f.n + 1 })
    }
    const out = await addComment(store, bob, { thread: t.id, text: 'second' })
    expect(out.comments.map((c) => c.text)).toEqual(['first', 'second'])
  })

  it('keeps a restricted thread to its group', async () => {
    const meta: ThreadMeta = { id: '9', title: 'CCT', author: { sub: 'c', name: 'C' }, at: '2010-01-01T00:00:00Z', last: '2010-01-01T00:00:00Z', comments: 0, group: 'cct-members' }
    const thread: Thread = { id: '9', title: 'CCT', author: meta.author, at: meta.at, html: '<p>x</p>', comments: [], group: 'cct-members' }
    const store = memory({ 'index.json': [meta], 'threads/9.json': thread })
    expect(await listThreads(store, ann)).toEqual([])
    expect(await readThread(store, ann, '9')).toBeNull()
    expect(await listThreads(store, bob)).toHaveLength(1)
    expect(await readThread(store, bob, '9')).not.toBeNull()
    await expect(addComment(store, ann, { thread: '9', text: 'x' })).rejects.toThrow('No such post')
  })

  it('lets only an admin hide, and hides from everyone else', async () => {
    const store = memory()
    const t = await createThread(store, ann, { title: 'A', text: 'a' })
    const c = (await addComment(store, bob, { thread: t.id, text: 'rude' })).comments[0]
    await expect(setHidden(store, ann, { thread: t.id, comment: c.id, hidden: true })).rejects.toThrow('admin')
    await setHidden(store, root, { thread: t.id, comment: c.id, hidden: true })
    expect((await readThread(store, ann, t.id))?.comments).toEqual([])
    expect((await readThread(store, root, t.id))?.comments).toHaveLength(1)
    expect((await listThreads(store, ann))[0]?.comments).toBe(0)
    await setHidden(store, root, { thread: t.id, hidden: true })
    expect(await readThread(store, ann, t.id)).toBeNull()
    expect(await listThreads(store, ann)).toEqual([])
    expect(await recentThreads(store)).toEqual([])
  })
})
