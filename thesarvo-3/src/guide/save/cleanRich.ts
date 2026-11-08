import type { Changes } from './changes'
import { isRichCls } from '#/guide/view/richText'
import { sanitizeHtml } from '#/rte/sanitize'
import type { GuideNode } from '#/guide/model/types'

/** A node with its HTML (rich header fields, notices, rich text blocks) put through the guide profile of the sanitiser. */
export function cleanNode(node: GuideNode): GuideNode {
  if (node.type === 'text') return isRichCls(node.cls) ? { ...node, text: sanitizeHtml(node.text, 'guide') } : node
  if (node.type !== 'header') return node
  const out = { ...node }
  for (const field of node.rich ?? []) out[field] = sanitizeHtml(node[field] ?? '', 'guide')
  // An empty notice stays (the editor has just added it and the save brings the server's guide back); the page shows none of it.
  if (node.notices) out.notices = node.notices.map((n) => ({ ...n, html: sanitizeHtml(n.html, 'guide') }))
  if (node.stewardEmail !== undefined) out.stewardEmail = node.stewardEmail.trim().slice(0, 200).replace(/[\s<>"',;()]/g, '')
  return out
}

/** The changes of a save with every rich field cleaned, so nothing the browser sent is stored as it came. */
export const cleanChanges = (changes: Changes): Changes => ({ ...changes, nodes: changes.nodes.map((c) => ({ ...c, after: c.after && cleanNode(c.after) })) })
