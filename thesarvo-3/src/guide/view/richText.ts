import type { Header, RichField } from '#/guide/model/types'

/** Text block styles whose text is HTML (the guide profile), not text with `<br/>`: plain rich text and the two callouts. */
export const RICH_CLASSES = ['rich', 'note', 'warning'] as const
export const isRichCls = (cls: string) => (RICH_CLASSES as readonly string[]).includes(cls)

/** Whether a header field holds HTML. */
export const isRich = (header: Header, field: RichField) => !!header.rich?.includes(field)

/** The words of some HTML (or of text with `<br/>`), for search, descriptions and history. Tags go; paragraph and line ends become spaces. */
export function stripTags(html: string): string {
  return html
    .replace(/<\/(p|li|ul|ol)>|<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}
