import { createSign } from 'node:crypto'
import type { Guide } from '#/guide/model/types'
import { formatJson } from '#/guide/content/syncFeed'
import { ensureIds } from './changes'
import type { HistoryEntry } from './history'
import { guidePath, historyPath } from './repo'
import type { Commit, GuideRepo, Stored } from './repo'

const API = 'https://api.github.com'

/** Returns a token for GitHub's API: a fixed one (`GITHUB_TOKEN`), or a GitHub App's installation token, renewed as it expires. */
export function githubAuth(env = process.env, fetcher: typeof fetch = fetch): () => Promise<string> {
  if (env.GITHUB_TOKEN) {
    const token = env.GITHUB_TOKEN
    return () => Promise.resolve(token)
  }
  const { GITHUB_APP_ID: app, GITHUB_APP_INSTALLATION_ID: installation, GITHUB_APP_PRIVATE_KEY: key } = env
  if (!app || !installation || !key) throw new Error('Set GITHUB_TOKEN, or GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID and GITHUB_APP_PRIVATE_KEY')
  let cached: { token: string; expires: number } | undefined
  return async () => {
    if (cached && cached.expires - Date.now() > 5 * 60_000) return cached.token
    const res = await fetcher(`${API}/app/installations/${installation}/access_tokens`, {
      method: 'POST',
      headers: { authorization: `Bearer ${appJwt(app, key.replace(/\\n/g, '\n'))}`, accept: 'application/vnd.github+json' },
    })
    if (!res.ok) throw new Error(`GitHub App token: ${res.status}`)
    const body = (await res.json()) as { token: string; expires_at: string }
    cached = { token: body.token, expires: Date.parse(body.expires_at) }
    return cached.token
  }
}

const base64url = (s: string | Buffer) => Buffer.from(s).toString('base64url')

/** A GitHub App's own token: a JWT signed with its private key, good for ten minutes at most. */
export function appJwt(appId: string, privateKey: string, now = Date.now()): string {
  const iat = Math.floor(now / 1000) - 60 // GitHub allows for clock drift this way
  const unsigned = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(JSON.stringify({ iat, exp: iat + 540, iss: appId }))}`
  return `${unsigned}.${createSign('RSA-SHA256').update(unsigned).sign(privateKey, 'base64url')}`
}

type Blob = { text: string | null; isTruncated: boolean } | null
type ReadResult = { repository: { ref: { target: { oid: string; guide: { object: Blob } | null; history: { object: Blob } | null } } | null } | null }

const READ = `query($owner: String!, $name: String!, $ref: String!, $guide: String!, $history: String!) {
  repository(owner: $owner, name: $name) { ref(qualifiedName: $ref) { target { oid ... on Commit {
    guide: file(path: $guide) { object { ... on Blob { text isTruncated } } }
    history: file(path: $history) { object { ... on Blob { text isTruncated } } }
  } } } }
}`

const COMMIT = `mutation($input: CreateCommitOnBranchInput!) { createCommitOnBranch(input: $input) { commit { oid } } }`

/** Saves as commits on a branch of the content repo, through GitHub's API: no checkout, so it runs in the Lambda. */
export class GitHubRepo implements GuideRepo {
  constructor(
    private readonly repo: string,
    private readonly branch: string,
    private readonly token = githubAuth(),
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<{ data?: T; errors?: { message: string }[] }> {
    const res = await this.fetcher(`${API}/graphql`, {
      method: 'POST',
      headers: { authorization: `Bearer ${await this.token()}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    })
    if (!res.ok) throw new Error(`GitHub: ${res.status}`)
    return (await res.json()) as { data?: T; errors?: { message: string }[] }
  }

  /** A file's text at a commit. GraphQL cuts big files short, so those come whole from the contents API. */
  private async text(file: { object: Blob } | null, path: string, oid: string): Promise<string | null> {
    if (!file?.object) return null
    if (!file.object.isTruncated) return file.object.text
    const res = await this.fetcher(`${API}/repos/${this.repo}/contents/${path}?ref=${oid}`, {
      headers: { authorization: `Bearer ${await this.token()}`, accept: 'application/vnd.github.raw+json' },
    })
    if (!res.ok) throw new Error(`GitHub ${path}: ${res.status}`)
    return res.text()
  }

  async read(id: string): Promise<Stored | null> {
    const { data, errors } = await this.graphql<ReadResult>(READ, {
      owner: this.repo.split('/')[0], name: this.repo.split('/')[1], ref: `refs/heads/${this.branch}`, guide: guidePath(id), history: historyPath(id),
    })
    const target = data?.repository?.ref?.target
    if (!target) throw new Error(`GitHub: ${errors?.[0]?.message ?? `no branch ${this.branch}`}`)
    const guide = await this.text(target.guide, guidePath(id), target.oid)
    if (guide === null) return null
    const history = await this.text(target.history, historyPath(id), target.oid)
    // The content repo holds what sync-content and these saves wrote.
    return { head: target.oid, guide: ensureIds(JSON.parse(guide) as Guide), history: history ? (JSON.parse(history) as HistoryEntry[]) : [] }
  }

  async commit({ id, head, guide, history, message }: Commit): Promise<string | null> {
    const file = (path: string, value: unknown) => ({ path, contents: Buffer.from(formatJson(value)).toString('base64') })
    const { data, errors } = await this.graphql<{ createCommitOnBranch: { commit: { oid: string } } }>(COMMIT, {
      input: {
        branch: { repositoryNameWithOwner: this.repo, branchName: this.branch },
        message,
        expectedHeadOid: head,
        fileChanges: { additions: [file(guidePath(id), guide), file(historyPath(id), history)] },
      },
    })
    if (data?.createCommitOnBranch) return data.createCommitOnBranch.commit.oid
    // Someone (another save, or sync-content) committed since this save read the guide.
    if (errors?.some((e) => /Expected branch to point to/i.test(e.message))) return null
    throw new Error(`GitHub commit: ${errors?.[0]?.message ?? 'failed'}`)
  }
}
