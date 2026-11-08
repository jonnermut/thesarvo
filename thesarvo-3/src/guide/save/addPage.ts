import type { Editor } from '#/auth/verifyToken'
import { isLocalPage } from '#/guide/content/syncFeed'
import type { StoredIndexNode } from '#/guide/content/syncFeed'
import { newNode } from '#/guide/edit/newNodes'
import type { Guide } from '#/guide/model/types'
import { diffGuides } from './changes'
import { updateBodyHistory, updateHistory } from './history'
import type { HistoryEntry } from './history'
import { editorWho } from './save'
import { newPagePosition } from './treeOps'
import type { PageRepo } from './repo'
import { Invalid, oneOf, str } from './validate'

/** What can be added: a guide, or a prose (HTML) page. */
export const PAGE_KINDS = ['guide', 'html'] as const
export type AddPageRequest = { parent: string; title: string; kind: (typeof PAGE_KINDS)[number] }

export const TITLE_MAX = 80
/** The first id for pages made here: Confluence's are far below, the test guide has 9000000001 and the sync leaves ids from here up alone (`isLocalPage`). */
export const FIRST_LOCAL_ID = 9_000_000_002

export function parseAddPage(body: unknown): AddPageRequest {
  if (typeof body !== 'object' || body === null) throw new Invalid('request: expected an object')
  const b = body as Record<string, unknown>
  const title = str(b.title, 'title').replace(/\s+/g, ' ').trim()
  if (!title || title.length > TITLE_MAX) throw new Invalid(`title: expected 1 to ${TITLE_MAX} characters`)
  if (/[<>]/.test(title)) throw new Invalid('title: no angle brackets please')
  const parent = str(b.parent, 'parent')
  if (!/^\d+$/.test(parent)) throw new Invalid('parent: expected a page id')
  return { parent, title, kind: oneOf(...PAGE_KINDS)(b.kind, 'kind') }
}

const flat = (n: StoredIndexNode): StoredIndexNode[] => [n, ...n.children.flatMap(flat)]

/** The next unused id for a page made here. */
export const nextPageId = (index: StoredIndexNode) =>
  String(Math.max(FIRST_LOCAL_ID - 1, ...flat(index).filter((n) => isLocalPage(n.id)).map((n) => Number(n.id))) + 1)

/** The index with a new child under `parent`, in its alphanumeric place when the pages there are in order, else last; null when there is no such page. */
export function withChild(index: StoredIndexNode, parent: string, child: StoredIndexNode): StoredIndexNode | null {
  let found = false
  const walk = (n: StoredIndexNode): StoredIndexNode => {
    if (n.id === parent) {
      found = true
      return { ...n, children: n.children.toSpliced(newPagePosition(n.children, child.title), 0, child) }
    }
    return { ...n, children: n.children.map(walk) }
  }
  const next = walk(index)
  return found ? next : null
}

/** A new guide: a header with the page's name and nothing else. */
export function newGuide(id: string, title: string): Guide {
  const header = newNode('header', '1')
  return { id, guideStars: '', nodes: [header.type === 'header' ? { ...header, name: title } : header] }
}

/** A new prose page: one empty paragraph, so the page is not taken for a missing body (an editor that is emptied saves ''). */
export const EMPTY_BODY = '<p></p>'

export type AddPageResult = { status: 'added'; id: string } | { status: 'missing' }

const ATTEMPTS = 5

/** Adds a page under `request.parent` (see `withChild` for where): its place in the index, an empty guide (or empty prose page) and a "created" history entry, in one commit. */
export async function addPage(repo: PageRepo, editor: Editor, request: AddPageRequest, now = () => new Date()): Promise<AddPageResult> {
  const who = await editorWho(editor)
  for (let attempt = 1; ; attempt++) {
    const { head, index } = await repo.readIndex()
    const id = nextPageId(index)
    const next = withChild(index, request.parent, { id, title: request.title, children: [] })
    if (!next) return { status: 'missing' }
    const at = now().toISOString()
    let content: { guide: Guide } | { html: string }
    let entry: HistoryEntry | undefined
    if (request.kind === 'html') {
      content = { html: EMPTY_BODY }
      ;[entry] = updateBodyHistory([], { session: `created-${id}`, user: who, at, before: '', after: EMPTY_BODY })
    } else {
      const guide = newGuide(id, request.title)
      content = { guide }
      ;[entry] = updateHistory([], { session: `created-${id}`, user: who, at, changes: diffGuides({ id, guideStars: '', nodes: [] }, guide), guide })
    }
    const history = entry ? [{ ...entry, description: 'created the page' }] : []
    const message = { headline: `${request.title}: ${who.name} created the page`, body: `Edit-User: ${who.name} <${who.sub}>\nAdd-Page: ${id} under ${request.parent}` }
    if (await repo.commitPage({ head, index: next, id, content, history, message })) return { status: 'added', id }
    if (attempt === ATTEMPTS) throw new Error('The site is busy: too many changes at once')
  }
}
