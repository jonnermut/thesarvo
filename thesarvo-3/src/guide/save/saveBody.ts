import type { Editor } from '#/auth/verifyToken'
import { sanitizeHtml } from '#/rte/sanitize'
import { updateBodyHistory } from './history'
import type { BodyRepo } from './repo'
import { editorWho } from './save'

export type SaveBodyRequest = { page: string; session: string; /** The HTML the editor started from; the save is refused when the page is no longer that. */ base: string; html: string; note?: string; /** The page's title, for the commit message. */ title?: string }

export type SaveBodyResult =
  | { status: 'saved'; head: string; html: string; at?: string }
  /** Someone saved the page since the editor loaded it; nothing was saved. */
  | { status: 'conflict'; head: string; html: string }
  | { status: 'missing' }

const ATTEMPTS = 5

/**
 * Saves a prose page's HTML as one commit with its history, like `saveGuide`: sanitised again here (the browser's copy is not trusted),
 * refused with the current text when the page changed since the editor read it, retried when the branch moved meanwhile.
 */
export async function savePageBody(repo: BodyRepo, editor: Editor, request: SaveBodyRequest, now = () => new Date()): Promise<SaveBodyResult> {
  const who = await editorWho(editor)
  const html = sanitizeHtml(request.html)
  for (let attempt = 1; ; attempt++) {
    const stored = await repo.readBody(request.page)
    if (!stored) return { status: 'missing' }
    if (stored.html === html) return { status: 'saved', head: stored.head, html }
    if (stored.html !== request.base) return { status: 'conflict', head: stored.head, html: stored.html }
    const at = now().toISOString()
    const history = updateBodyHistory(stored.history, { session: request.session, user: who, at, before: stored.html, after: html, note: request.note })
    const message = {
      headline: `${request.title?.trim() || `Page ${request.page}`}: ${who.name} edited the page`,
      body: [`Edit-Session: ${request.session}`, `Edit-User: ${who.name} <${who.sub}>`].join('\n'),
    }
    const head = await repo.commitBody({ id: request.page, head: stored.head, html, history, message })
    if (head) return { status: 'saved', head, html, at }
    if (attempt === ATTEMPTS) throw new Error('The page is busy: too many saves at once')
  }
}
