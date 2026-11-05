import type { Editor } from '#/auth/verifyToken'
import type { StoredIndexNode } from '#/guide/content/syncFeed'
import { editorWho } from './save'
import type { PageRepo } from './repo'
import { Invalid, str } from './validate'

export type DeletePageRequest = { page: string }

export function parseDeletePage(body: unknown): DeletePageRequest {
  if (typeof body !== 'object' || body === null) throw new Invalid('request: expected an object')
  const page = str((body as Record<string, unknown>).page, 'page')
  if (!/^\d+$/.test(page)) throw new Invalid('page: expected a page id')
  return { page }
}

export const isAdmin = (editor: Pick<Editor, 'groups'>) => editor.groups.includes('admins')

const flat = (n: StoredIndexNode): StoredIndexNode[] => [n, ...n.children.flatMap(flat)]

/** The index without the page and everything under it, and those pages; null when there is no such page. The top of the tree is never removed. */
export function withoutPage(index: StoredIndexNode, id: string): { index: StoredIndexNode; removed: StoredIndexNode[] } | null {
  if (index.id === id) return null
  let removed: StoredIndexNode[] | null = null
  const walk = (n: StoredIndexNode): StoredIndexNode => {
    const hit = n.children.find((c) => c.id === id)
    if (hit) removed = flat(hit)
    return { ...n, children: n.children.filter((c) => c.id !== id).map(walk) }
  }
  const next = walk(index)
  return removed ? { index: next, removed } : null
}

export type DeletePageResult = { status: 'deleted'; ids: string[] } | { status: 'missing' } | { status: 'forbidden' }

const ATTEMPTS = 5

/**
 * Admin only: takes a page and the pages under it out of the page tree, in one commit. Their guide and history files stay in the content repo
 * (nothing reads them once the page is not in the tree), so the commit can be reverted to bring the pages back.
 */
export async function deletePage(repo: PageRepo, editor: Editor, request: DeletePageRequest): Promise<DeletePageResult> {
  if (!isAdmin(editor)) return { status: 'forbidden' }
  const who = await editorWho(editor)
  for (let attempt = 1; ; attempt++) {
    const { head, index } = await repo.readIndex()
    const next = withoutPage(index, request.page)
    if (!next) return { status: 'missing' }
    const title = flat(index).find((n) => n.id === request.page)?.title ?? request.page
    const extra = next.removed.length - 1
    const message = {
      headline: `${title}: ${who.name} deleted the page${extra ? ` and ${extra} under it` : ''}`,
      body: `Edit-User: ${who.name} <${who.sub}>\nDelete-Page: ${next.removed.map((n) => n.id).join(' ')}`,
    }
    if (await repo.commitIndex({ head, index: next.index, message })) return { status: 'deleted', ids: next.removed.map((n) => n.id) }
    if (attempt === ATTEMPTS) throw new Error('The site is busy: too many changes at once')
  }
}
