import { generateKeyPairSync, createVerify } from 'node:crypto'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Guide, GuideNode, Header, TextBlock } from '#/guide/model/types'
import { diffGuides } from './changes'
import { GitHubRepo, appJwt } from './github'
import { LocalRepo } from './local'
import type { Commit, GuideRepo, Stored } from './repo'
import { saveGuide } from './save'

const header: Header = { type: 'header', id: 'h', name: 'Bruny', rock: '', sun: '', walk: '', access: '', camping: '', acknowledgement: '', intro: '', history: '', autonumber: '' }
const text = (id: string, t = ''): TextBlock => ({ type: 'text', id, cls: 'text', text: t })
const guide = (...nodes: GuideNode[]): Guide => ({ id: '7', guideStars: '', nodes })
const jon = { sub: 's1', email: 'jon@example.com', name: 'Jon', groups: [] }
const request = (from: Guide, to: Guide, session = 'a') => ({ guide: '7', session, changes: diffGuides(from, to) })

/** A repo in memory; `before` runs before each commit, to slip someone else's save in. */
class MemoryRepo implements GuideRepo {
  commits: Commit[] = []
  constructor(public stored: Stored, public before = () => {}) {}
  read = (id: string) => Promise.resolve(id === '7' ? this.stored : null)
  commit = (c: Commit) => {
    this.before()
    if (c.head !== this.stored.head) return Promise.resolve(null)
    this.commits.push(c)
    this.stored = { head: `c${this.commits.length}`, guide: c.guide, history: c.history }
    return Promise.resolve(this.stored.head)
  }
}

describe('saveGuide', () => {
  const base = guide(header, text('1', 'a'), text('2', 'b'))
  it('commits the merged guide and its session history, with a message saying what changed', async () => {
    const repo = new MemoryRepo({ head: 'c0', guide: base, history: [] })
    const mine = guide(header, text('1', 'mine'), text('2', 'b'))
    const result = await saveGuide(repo, jon, request(base, mine), () => new Date('2026-10-27T00:00:00Z'))
    expect(result).toMatchObject({ status: 'saved', head: 'c1', guide: mine })
    expect(repo.commits[0].message.headline).toBe('Bruny: Jon edited a text block')
    expect(repo.commits[0].message.body).toContain('Edit-Session: a\nEdit-User: Jon <s1>\nEdit-Nodes: 1')
    expect(repo.stored.history).toMatchObject([{ session: 'a', user: { sub: 's1', name: 'Jon' }, saves: 1, description: 'edited a text block' }])
  })

  it('merges again when someone committed in between', async () => {
    const theirs = guide(header, text('1', 'a'), text('2', 'theirs'))
    let once = true
    const repo = new MemoryRepo({ head: 'c0', guide: base, history: [] }, () => {
      if (once) repo.stored = { head: 'x', guide: theirs, history: [] }
      once = false
    })
    const result = await saveGuide(repo, jon, request(base, guide(header, text('1', 'mine'), text('2', 'b'))))
    expect(result).toMatchObject({ status: 'saved', guide: guide(header, text('1', 'mine'), text('2', 'theirs')) })
  })

  it('commits nothing on a conflict, or when there is nothing to save', async () => {
    const repo = new MemoryRepo({ head: 'c0', guide: guide(header, text('1', 'theirs'), text('2', 'b')), history: [] })
    expect(await saveGuide(repo, jon, request(base, guide(header, text('1', 'mine'), text('2', 'b'))))).toMatchObject({ status: 'conflict', conflicts: [{ id: '1' }] })
    expect(await saveGuide(repo, jon, request(base, base))).toMatchObject({ status: 'saved', head: 'c0' })
    expect(repo.commits).toEqual([])
    expect(await saveGuide(repo, jon, { ...request(base, base), guide: '8' })).toEqual({ status: 'missing' })
  })
})

describe('LocalRepo', () => {
  it('reads from the content source until saved, and refuses a stale head', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'saves-'))
    const source = { getGuide: (id: string) => Promise.resolve(id === '7' ? guide(header, text('', 'no id')) : null), getIndex: () => Promise.reject(new Error('no index')) }
    const repo = new LocalRepo(dir, () => source)
    const first = await repo.read('7')
    expect(first?.guide.nodes[1]).toEqual(text('1', 'no id'))
    const message = { headline: 'h', body: '' }
    const head = await repo.commit({ id: '7', head: first?.head ?? '', guide: guide(header, text('1', 'saved')), history: [], message })
    expect(head).toBeTruthy()
    expect(await repo.commit({ id: '7', head: first?.head ?? '', guide: base(), history: [], message })).toBeNull()
    expect(JSON.parse(await readFile(path.join(dir, 'pages/7/guide.json'), 'utf8'))).toEqual(guide(header, text('1', 'saved')))
    expect((await repo.read('7'))?.head).toBe(head)
  })
  const base = () => guide(header)
})

describe('GitHubRepo', () => {
  /** A fetch that answers GitHub's GraphQL from a script, recording each call. */
  const github = (answers: unknown[]) => {
    const calls: { url: string; body: unknown }[] = []
    const fetcher = (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : undefined })
      const answer = answers.shift()
      return Promise.resolve(typeof answer === 'string' ? new Response(answer) : Response.json(answer))
    }
    return { calls, repo: new GitHubRepo('o/content', 'main', () => Promise.resolve('t'), fetcher) }
  }

  it('reads a guide and its history at the branch head, fetching big files whole', async () => {
    const g = guide(header, text('1'))
    const { repo, calls } = github([
      { data: { repository: { ref: { target: { oid: 'abc', guide: { object: { text: null, isTruncated: true } }, history: null } } } } },
      JSON.stringify(g),
    ])
    expect(await repo.read('7')).toEqual({ head: 'abc', guide: g, history: [] })
    expect(calls[1].url).toBe('https://api.github.com/repos/o/content/contents/pages/7/guide.json?ref=abc')
  })

  it('commits both files on the expected head, and tells a stale head', async () => {
    const { repo, calls } = github([
      { data: { createCommitOnBranch: { commit: { oid: 'def' } } } },
      { data: { createCommitOnBranch: null }, errors: [{ message: 'Expected branch to point to "abc" but it did not' }] },
    ])
    const c = { id: '7', head: 'abc', guide: guide(header), history: [], message: { headline: 'h', body: 'b' } }
    expect(await repo.commit(c)).toBe('def')
    expect(await repo.commit(c)).toBeNull()
    expect(calls[0].body).toMatchObject({
      variables: { input: { expectedHeadOid: 'abc', branch: { repositoryNameWithOwner: 'o/content', branchName: 'main' }, fileChanges: { additions: [{ path: 'pages/7/guide.json' }, { path: 'pages/7/history.json' }] } } },
    })
  })

  it('reads the page tree, and adds a page in one commit with the tree, guide and history', async () => {
    const tree = { id: '1', title: 'Guides', children: [] }
    const { repo, calls } = github([
      { data: { repository: { ref: { target: { oid: 'abc', index: { object: { text: JSON.stringify(tree), isTruncated: false } } } } } } },
      { data: { createCommitOnBranch: { commit: { oid: 'def' } } } },
    ])
    expect(await repo.readIndex()).toEqual({ head: 'abc', index: tree })
    const message = { headline: 'h', body: 'b' }
    expect(await repo.commitPage({ head: 'abc', index: tree, id: '9000000002', guide: guide(header), history: [], message })).toBe('def')
    expect(calls[1].body).toMatchObject({
      variables: { input: { expectedHeadOid: 'abc', fileChanges: { additions: [{ path: 'index.json' }, { path: 'pages/9000000002/guide.json' }, { path: 'pages/9000000002/history.json' }] } } },
    })
  })
})

describe('appJwt', () => {
  it('is an RS256 token GitHub can check with the app’s public key', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const jwt = appJwt('123', privateKey.export({ type: 'pkcs1', format: 'pem' }).toString(), 1_000_000_000)
    const [h, p, sig] = jwt.split('.')
    expect(JSON.parse(Buffer.from(p, 'base64url').toString())).toEqual({ iat: 999_940, exp: 1_000_480, iss: '123' })
    expect(createVerify('RSA-SHA256').update(`${h}.${p}`).verify(publicKey, sig, 'base64url')).toBe(true)
  })
})
