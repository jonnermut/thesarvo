import { flatten } from './paths'
import type { ContentSource, IndexNode } from './types'

/**
 * Who may read a page, from `access.json` at the root of the content repo, keyed by page id. A page with no entry
 * (and no ancestor with one) is public. Groups are roles: `admins` is the admin role (history, deletion, everything
 * readable), and any other group is membership. `groups`: Cognito groups that may read it; `signedIn`: any signed-in user
 * may; `draft`: not published, so only admins and `groups`. Admins read everything. The static build leaves out every page with an entry, and the pages
 * below it; the private API (src/routes/g.api.private) serves them to the right people.
 */
export type PageAccess = { groups?: string[]; signedIn?: true; draft?: true }
export type AccessMap = Record<string, PageAccess>

export const ADMINS = 'admins'

/** Reads `access.json`'s text; throws on anything that is not a map of id to `{ groups?, signedIn?, draft? }`, so a typo never makes a page public. */
export function parseAccess(text: string | null): AccessMap {
  if (text === null) return {}
  const raw: unknown = JSON.parse(text)
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('access.json: expected an object')
  const out: AccessMap = {}
  for (const [id, value] of Object.entries(raw)) {
    const v: unknown = value
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Error(`access.json: ${id}: expected an object`)
    const { groups, signedIn, draft, ...rest } = v as Record<string, unknown>
    if (Object.keys(rest).length) throw new Error(`access.json: ${id}: unknown field ${Object.keys(rest)[0]}`)
    if (groups !== undefined && !(Array.isArray(groups) && groups.every((g) => typeof g === 'string' && g))) throw new Error(`access.json: ${id}: groups must be a list of names`)
    if (signedIn !== undefined && signedIn !== true) throw new Error(`access.json: ${id}: signedIn must be true`)
    if (draft !== undefined && draft !== true) throw new Error(`access.json: ${id}: draft must be true`)
    out[id] = { ...(groups && { groups: groups as string[] }), ...(signedIn && { signedIn: true as const }), ...(draft && { draft: true as const }) }
  }
  return out
}

/** The pages that are not public, by id, each with the access that applies: its own entry, else the nearest ancestor's. */
export function privateAccess(root: Pick<IndexNode, 'id' | 'children'>, access: AccessMap): Map<string, PageAccess> {
  const out = new Map<string, PageAccess>()
  const walk = (n: Pick<IndexNode, 'id' | 'children'>, inherited: PageAccess | undefined) => {
    const own = access[n.id] ?? inherited
    if (own) out.set(n.id, own)
    for (const c of n.children) walk(c, own)
  }
  walk(root, undefined)
  return out
}

/** May this user read the page? `groups` is the signed-in user's Cognito groups, or null for someone not signed in. */
export const canRead = (a: PageAccess, groups: readonly string[] | null) =>
  groups !== null && (groups.includes(ADMINS) || !!a.signedIn || !!a.groups?.some((g) => groups.includes(g)))

/** Is this user an admin (the admin role: history operations, page deletion, and reading everything)? */
export const isAdmin = (groups: readonly string[] | null) => !!groups?.includes(ADMINS)

/** The tree without private pages and everything below them. */
export function publicTree(root: IndexNode, hidden: ReadonlyMap<string, PageAccess>): IndexNode {
  const keep = (n: IndexNode): IndexNode => ({ ...n, children: n.children.filter((c) => !hidden.has(c.id)).map(keep) })
  return keep(root)
}

/**
 * A source that knows nothing of private pages: not in the tree, and no guide, body, history or photo list for their ids.
 * Everything that builds or serves the public site reads through this.
 */
export function publicSource(source: ContentSource, getAccess: () => Promise<AccessMap>): ContentSource {
  let hidden: Promise<ReadonlyMap<string, PageAccess>> | undefined
  const hiddenIds = () => (hidden ??= source.getIndex().then(async (index) => privateAccess(index, await getAccess())))
  const isPrivate = async (id: string) => (await hiddenIds()).has(id)
  return {
    getIndex: async () => publicTree(await source.getIndex(), await hiddenIds()),
    getGuide: async (id) => ((await isPrivate(id)) ? null : source.getGuide(id)),
    getPageBody: async (id) => ((await isPrivate(id)) ? null : source.getPageBody(id)),
    getHistory: async (id) => ((await isPrivate(id)) ? [] : source.getHistory(id)),
    listImages: async (id) => ((await isPrivate(id)) ? [] : source.listImages(id)),
    saveImage: (id, name, bytes) => source.saveImage(id, name, bytes),
    // Photos are stored as `<id>-<name>` in the folder source, so a private guide's must not be served either.
    readFile: async (name) => {
      const id = /^(\d+)-/.exec(name)?.[1]
      return id && (await isPrivate(id)) ? null : source.readFile(name)
    },
  }
}

/** Every private page's id in a tree, in tree order. */
export const privateNodes = (root: IndexNode, hidden: ReadonlyMap<string, PageAccess>) => flatten(root).filter((n) => hidden.has(n.id))
