/** Who wrote something: a Cognito `sub`, or `confluence:<username>` for the old forum's posts. `key` is their email's avatar key (see avatars/keys.ts), set on new posts. */
export type Author = { sub: string; name: string; key?: string }

/**
 * A post's or comment's text: `html` is the allow-listed HTML the Confluence export produced, `text` is what people type here
 * (plain paragraphs; links are made clickable when shown). One of them is set.
 */
type Text = { html?: string; text?: string }

/** `edited`: when the author last changed the text. `removed`: the author deleted it (hidden too, and an admin cannot bring it back). */
export type Comment = Text & { id: string; parent: string | null; author: Author; at: string; hidden?: boolean; removed?: boolean; edited?: string }

/** `group`: set on a thread only that Cognito group may read (the CCT forum). `notice`: when an admin made it a notice, the time it stops being one (ISO). */
export type Thread = Text & { id: string; title: string; author: Author; at: string; comments: Comment[]; group?: string; hidden?: boolean; removed?: boolean; edited?: string; notice?: string }

/** A thread an admin marked as a notice: shown with its text (not its comments) at the top of the home page and the forum until `until`. Public, so never a restricted thread. */
export type Notice = Text & { id: string; title: string; author: Author; at: string; until: string }

export const noticeOf = (t: Thread): Notice | null =>
  t.notice && !t.hidden && !t.group ? { id: t.id, title: t.title, author: t.author, at: t.at, until: t.notice, ...(t.html && { html: t.html }), ...(t.text && { text: t.text }) } : null

/** What the thread list needs: no text. `last` is the time of the newest comment (or the post). */
export type ThreadMeta = { id: string; title: string; author: Author; at: string; last: string; comments: number; group?: string; notice?: string }

export const metaOf = (t: Thread): ThreadMeta => {
  const visible = t.comments.filter((c) => !c.hidden)
  return {
    id: t.id,
    title: t.title,
    author: t.author,
    at: t.at,
    last: visible.reduce((m, c) => (c.at > m ? c.at : m), t.at),
    comments: visible.length,
    ...(t.group && { group: t.group }),
    ...(t.notice && { notice: t.notice }),
  }
}
