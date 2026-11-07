import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { HistoryEntry } from './history'
import { LocalRepo } from './local'
import type { BodyRepo, StoredBody } from './repo'
import { savePageBody } from './saveBody'

const jon = { sub: 's1', email: 'jon@example.com', name: 'Jon', groups: [] }
const at = () => new Date('2026-11-08T00:00:00Z')

class MemoryRepo implements BodyRepo {
  commits: Parameters<BodyRepo['commitBody']>[0][] = []
  constructor(public stored: StoredBody, public before = () => {}) {}
  readBody = (id: string) => Promise.resolve(id === '7' ? this.stored : null)
  commitBody = (c: Parameters<BodyRepo['commitBody']>[0]) => {
    this.before()
    if (c.head !== this.stored.head) return Promise.resolve(null)
    this.commits.push(c)
    this.stored = { head: `c${this.commits.length}`, html: c.html, history: c.history }
    return Promise.resolve(this.stored.head)
  }
}

const start = (html = '<p>old</p>'): StoredBody => ({ head: 'c0', html, history: [] })
const req = (html: string, extra: Partial<Parameters<typeof savePageBody>[2]> = {}) => ({ page: '7', session: 'a', base: '<p>old</p>', html, ...extra })

describe('savePageBody', () => {
  it('commits the sanitised HTML with a history entry and a message', async () => {
    const repo = new MemoryRepo(start())
    const result = await savePageBody(repo, jon, req('<p onclick="x()">new</p><script>x</script>'), at)
    expect(result).toMatchObject({ status: 'saved', head: 'c1', html: '<p>new</p>' })
    expect(repo.commits[0].message.headline).toBe('Page 7: Jon edited the page')
    expect(repo.commits[0].history[0]).toMatchObject({ user: { sub: 's1', name: 'Jon' }, body: { before: '<p>old</p>', after: '<p>new</p>' }, description: 'edited the page' })
  })

  it('folds one session into one history entry, and drops it when the session ends where it began', async () => {
    const repo = new MemoryRepo(start())
    await savePageBody(repo, jon, req('<p>one</p>'), at)
    await savePageBody(repo, jon, req('<p>two</p>', { base: '<p>one</p>' }), at)
    expect(repo.stored.history).toHaveLength(1)
    expect(repo.stored.history[0]).toMatchObject({ saves: 2, body: { before: '<p>old</p>', after: '<p>two</p>' } })
    await savePageBody(repo, jon, req('<p>old</p>', { base: '<p>two</p>' }), at)
    expect(repo.stored.history).toEqual([])
  })

  it('commits nothing when nothing changed, and nothing on a stale base', async () => {
    const repo = new MemoryRepo(start())
    expect(await savePageBody(repo, jon, req('<p>old</p>'), at)).toMatchObject({ status: 'saved', head: 'c0' })
    expect(await savePageBody(repo, jon, req('<p>mine</p>', { base: '<p>older</p>' }), at)).toEqual({ status: 'conflict', head: 'c0', html: '<p>old</p>' })
    expect(repo.commits).toEqual([])
  })

  it('retries when someone else committed in between, and reports a missing page', async () => {
    const repo = new MemoryRepo(start(), () => {
      repo.before = () => {}
      repo.stored = { ...repo.stored, head: 'other' }
    })
    expect(await savePageBody(repo, jon, req('<p>new</p>'), at)).toMatchObject({ status: 'saved', head: 'c1' })
    expect(await savePageBody(repo, jon, req('<p>x</p>', { page: '9' }), at)).toEqual({ status: 'missing' })
  })
})

describe('LocalRepo page bodies', () => {
  it('reads from the content source until saved, and refuses a stale head', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'saves-'))
    const source = { getGuide: () => Promise.resolve(null), getIndex: () => Promise.reject(new Error('no index')), getPageBody: (id: string) => Promise.resolve(id === '8' ? '<p>from the source</p>' : null) }
    const repo = new LocalRepo(dir, () => source)
    const first = await repo.readBody('8')
    expect(first?.html).toBe('<p>from the source</p>')
    expect(await repo.readBody('9')).toBeNull()
    const history: HistoryEntry[] = []
    const message = { headline: 'h', body: '' }
    const head = await repo.commitBody({ id: '8', head: first?.head ?? '', html: '<p>saved</p>', history, message })
    expect((await repo.readBody('8'))?.html).toBe('<p>saved</p>')
    expect(await repo.commitBody({ id: '8', head: first?.head ?? '', html: '<p>stale</p>', history, message })).toBeNull()
    expect(head).toBe((await repo.readBody('8'))?.head)
  })
})
