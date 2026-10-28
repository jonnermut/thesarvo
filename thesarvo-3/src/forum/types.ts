/** Who wrote something: a Cognito `sub`, or `confluence:<username>` for the old forum's posts. */
export type Author = { sub: string; name: string }

/**
 * A post's or comment's text: `html` is the allow-listed HTML the Confluence export produced, `text` is what people type here
 * (plain paragraphs; links are made clickable when shown). One of them is set.
 */
type Text = { html?: string; text?: string }

export type Comment = Text & { id: string; parent: string | null; author: Author; at: string; hidden?: boolean }

/** `group`: set on a thread only that Cognito group may read (the CCT forum). */
export type Thread = Text & { id: string; title: string; author: Author; at: string; comments: Comment[]; group?: string; hidden?: boolean }

/** What the thread list needs: no text. `last` is the time of the newest comment (or the post). */
export type ThreadMeta = { id: string; title: string; author: Author; at: string; last: string; comments: number; group?: string }

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
  }
}
