import { getFullContent } from '#/guide/content'
import { pageDecision } from '#/guide/content/privateSite'
import type { Editor } from './verifyToken'

/** The page's decision for a signed-in user: public, private and theirs to read, or private and not. */
export async function pageAccess(editor: Pick<Editor, 'groups'>, id: string) {
  const { all, access } = getFullContent()
  return pageDecision(await all.getIndex(), await access(), id, editor.groups)
}

/** A 403 for a private page this user may not read, else null. Every route that reads or changes one page by id calls this first. */
export async function guardPage(editor: Pick<Editor, 'groups'>, id: string): Promise<Response | null> {
  return (await pageAccess(editor, id)) === 'denied' ? Response.json({ error: 'You do not have access to this page' }, { status: 403 }) : null
}
