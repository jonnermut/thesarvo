/** Whether editor HTML holds nothing but empty paragraphs (client safe; the server uses `hasContent`). */
export const isBlank = (html: string) => !/<(?:img|iframe|hr)\b/i.test(html) && !html.replace(/<[^>]*>|&nbsp;/g, '').trim()

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Plain text (an older post) as the paragraphs the editor starts from. */
export const textToHtml = (text: string) =>
  text
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map((p) => `<p>${escape(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
