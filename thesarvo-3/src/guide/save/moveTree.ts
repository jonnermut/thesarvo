import type { Editor } from '#/auth/verifyToken'
import type { StoredIndexNode } from '#/guide/content/syncFeed'
import { TITLE_MAX } from './addPage'
import { isAdmin } from './deletePage'
import { editorWho } from './save'
import type { PageRepo } from './repo'
import { Invalid, str } from './validate'
import { flat, sameIds, withMoved, withMovedPage, withSortedChildren, withTitle } from './treeOps'
import type { Moved } from './treeOps'

export type { Moved }

const pageId = (v: unknown, name: string) => {
  const s = str(v, name)
  if (!/^\d+$/.test(s)) throw new Invalid(`${name}: expected a page id`)
  return s
}

export type TreeChange =
  | { action: 'rename'; page: string; title: string }
  | { action: 'move'; page: string; parent: string; position: number }
  /** Puts the pages directly under `parent` in alphanumeric order. */
  | { action: 'sort'; parent: string }
  /** Puts back the tree as it was (undo): the same pages, in their old places and with their old titles. */
  | { action: 'restore'; index: StoredIndexNode }

function parseNode(v: unknown, depth = 0): StoredIndexNode {
  if (typeof v !== 'object' || v === null || depth > 20) throw new Invalid('index: expected a page tree')
  const o = v as Record<string, unknown>
  if (!Array.isArray(o.children)) throw new Invalid('index: expected children')
  return { id: pageId(o.id, 'index id'), title: str(o.title, 'index title'), children: o.children.map((c) => parseNode(c, depth + 1)) }
}

export function parseTreeChange(body: unknown): TreeChange {
  if (typeof body !== 'object' || body === null) throw new Invalid('request: expected an object')
  const b = body as Record<string, unknown>
  switch (b.action) {
    case 'rename': {
      const title = str(b.title, 'title').replace(/\s+/g, ' ').trim()
      if (!title || title.length > TITLE_MAX) throw new Invalid(`title: expected 1 to ${TITLE_MAX} characters`)
      if (/[<>]/.test(title)) throw new Invalid('title: no angle brackets please')
      return { action: 'rename', page: pageId(b.page, 'page'), title }
    }
    case 'move': {
      if (!Number.isInteger(b.position) || (b.position as number) < 0) throw new Invalid('position: expected a whole number from 0')
      return { action: 'move', page: pageId(b.page, 'page'), parent: pageId(b.parent, 'parent'), position: b.position as number }
    }
    case 'sort':
      return { action: 'sort', parent: pageId(b.parent, 'parent') }
    case 'restore':
      return { action: 'restore', index: parseNode(b.index) }
    default:
      throw new Invalid('action: expected rename, move, sort or restore')
  }
}

export type TreeChangeResult =
  | { status: 'done'; before: StoredIndexNode; index: StoredIndexNode; moved: Moved }
  | { status: 'invalid'; error: string }
  | { status: 'forbidden' }

const ATTEMPTS = 5

/** Admin only: renames a page, moves it (with the pages under it) or puts back an earlier tree, in one commit; old addresses of pages whose address changed are kept as redirects. */
export async function changeTree(repo: PageRepo, editor: Editor, change: TreeChange): Promise<TreeChangeResult> {
  if (!isAdmin(editor)) return { status: 'forbidden' }
  const who = await editorWho(editor)
  for (let attempt = 1; ; attempt++) {
    const { head, index, moved } = await repo.readIndex()
    const title = (id: string) => flat(index).find((n) => n.id === id)?.title ?? id
    let next: StoredIndexNode | null
    let what: string
    let trailer: string
    if (change.action === 'rename') {
      next = withTitle(index, change.page, change.title)
      what = `renamed the page to ${change.title}`
      trailer = `Rename-Page: ${change.page}`
    } else if (change.action === 'move') {
      next = withMovedPage(index, change.page, change.parent, change.position)
      what = `moved the page under ${title(change.parent)}`
      trailer = `Move-Page: ${change.page} under ${change.parent} at ${change.position}`
    } else if (change.action === 'sort') {
      next = withSortedChildren(index, change.parent)
      what = 'put the pages under it in alphabetical order'
      trailer = `Sort-Pages: ${change.parent}`
    } else {
      next = sameIds(index, change.index) ? change.index : null
      what = 'undid a change to the page tree'
      trailer = 'Restore-Tree: undo'
    }
    if (!next) return { status: 'invalid', error: change.action === 'restore' ? 'Pages were added or deleted since, so that change can no longer be undone' : 'Cannot do that: no such page, or into itself' }
    const message = { headline: `${change.action === 'restore' ? 'Page tree' : title('page' in change ? change.page : change.parent)}: ${who.name} ${what}`, body: `Edit-User: ${who.name} <${who.sub}>\n${trailer}` }
    const nextMoved = withMoved(moved, index, next)
    if (await repo.commitIndex({ head, index: next, moved: nextMoved, message })) return { status: 'done', before: index, index: next, moved: nextMoved }
    if (attempt === ATTEMPTS) throw new Error('The site is busy: too many changes at once')
  }
}
