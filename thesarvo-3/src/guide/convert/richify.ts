/**
 * Guide text written the old way (a string with `<br/>` for line breaks, and pseudo formatting such as `•` lines, `1.` lines, `**bold**`
 * and bare addresses) turned into the HTML of the guide profile (`sanitizeHtml(html, 'guide')`). Pure strings, so the editor's
 * "Add formatting" button and the migration script (thesarvo-private/scripts) share it. Nothing here needs a DOM.
 */
import { startsParagraph } from '../view/breaks'

/** One block of the result: an HTML paragraph or list, or a notice (`kind`) whose `html` is the inline HTML of its text. */
export type Para = { html: string; kind?: 'note' | 'warning' }

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const BR = /<br\s*\/?>/i
const BULLET = /^[-–•·*]\s+(\S.*)$/
const NUMBER = /^(\d{1,3})[.)]\s+(\S.*)$/
const RULE = /^[-=_]{4,}$/
const LABEL = /^([A-Z][A-Z '&/-]{2,30}:)(\s|$)/
const URL = /https?:\/\/[^\s<>"]+/g
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g

/** Bare web and email addresses become links; the full stop after one stays outside it. */
function link(text: string): string {
  const withUrls = text.replace(URL, (u) => {
    let tail = /[.,;:!?)\]]+$/.exec(u)?.[0] ?? ''
    // A closing bracket the address itself opened ("…plots-(sites-m-z)") belongs to it.
    const open = (u.slice(0, u.length - tail.length).match(/\(/g) ?? []).length - (u.slice(0, u.length - tail.length).match(/\)/g) ?? []).length
    for (let k = 0; k < open && tail.startsWith(')'); k++) tail = tail.slice(1)
    const url = u.slice(0, u.length - tail.length)
    return `<a href="${url}" rel="noopener noreferrer nofollow">${url}</a>${tail}`
  })
  // Addresses inside the links just made are left alone.
  return withUrls
    .split(/(<a [^>]*>.*?<\/a>)/)
    .map((part, i) => (i % 2 ? part : part.replace(EMAIL, (m) => `<a href="mailto:${m}">${m}</a>`)))
    .join('')
}

/** Escapes a line, turns `**bold**` and `*italic*` into tags and bare addresses into links. A lone `*` (the star legend) is left as it is. */
function inline(line: string): string {
  const e = escape(line)
    .replace(/\*{2,3}([^*\s](?:[^*]*[^*\s])?)\s*\*{2,3}/g, '<strong>$1</strong>')
    .replace(/(?<![\w*])\*([^*\s](?:[^*]*[^*\s])?)\*(?![\w*])/g, '<em>$1</em>')
  return link(e)
}

type Line = { text: string; bullet?: string; number?: { n: number; text: string } }

function classify(raw: string): Line {
  const text = raw.replace(/\u00a0/g, ' ').trim()
  const b = BULLET.exec(text)
  if (b) return { text, bullet: b[1] ?? '' }
  const n = NUMBER.exec(text)
  return n ? { text, number: { n: Number(n[1]), text: n[2] ?? '' } } : { text }
}

/** A notice at the start of a paragraph: a bold-only paragraph or "WARNING:" / "NOTE:" with the label taken off. */
function callout(text: string): { kind: 'note' | 'warning'; text: string } | null {
  const bold = /^\*{2,3}([^*\s](?:[^*]*[^*\s])?)\s*\*{2,3}$/.exec(text)
  if (bold && !/\*/.test(bold[1] ?? '')) return { kind: 'warning', text: bold[1] ?? '' }
  const label = /^(WARNING|CAUTION|IMPORTANT|NOTE)\s*[:!]\s*(\S[\s\S]*)$/.exec(text)
  if (label) return { kind: label[1] === 'NOTE' ? 'note' : 'warning', text: label[2] ?? '' }
  return null
}

/** The text as blocks: paragraphs (a single line break after a finished sentence starts a new one, otherwise it stays a `<br>`), lists and notices, in order. */
export function textToParas(text: string): Para[] {
  const lines = text.split(BR).map(classify)
  const out: Para[] = []
  let para: string[] = []
  const flush = () => {
    if (!para.length) return
    const joined = para.join('\n')
    const c = callout(joined.replace(/\n/g, ' '))
    out.push(c ? { kind: c.kind, html: inline(c.text) } : { html: `<p>${para.map(labelled).map(inline).join('<br>')}</p>` })
    para = []
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.text || RULE.test(line.text)) {
      flush()
      continue
    }
    // A list is two or more bullet lines (one for a "•"), or two or more numbered lines.
    const run = (pick: (l: Line) => boolean) => {
      let j = i
      while (j < lines.length && pick(lines[j])) j++
      return j
    }
    const bulletEnd = line.bullet !== undefined ? run((l) => l.bullet !== undefined) : i
    if (line.bullet !== undefined && (bulletEnd - i > 1 || line.text.startsWith('•'))) {
      flush()
      out.push({ html: `<ul>${lines.slice(i, bulletEnd).map((l) => `<li>${inline(l.bullet ?? '')}</li>`).join('')}</ul>` })
      i = bulletEnd - 1
      continue
    }
    const numberEnd = line.number ? run((l) => l.number !== undefined) : i
    if (line.number && numberEnd - i > 1) {
      flush()
      const start = line.number.n
      out.push({ html: `<ol${start === 1 ? '' : ` start="${start}"`}>${lines.slice(i, numberEnd).map((l) => `<li>${inline(l.number?.text ?? '')}</li>`).join('')}</ol>` })
      i = numberEnd - 1
      continue
    }
    // A single break after a finished sentence is a paragraph too, so nobody needs to type blank lines for spacing.
    if (para.length && startsParagraph(para.at(-1) ?? '', line.text)) flush()
    para.push(line.text)
  }
  flush()
  return out
}

/** "THE DRIVE:" at the start of a paragraph is bold; what follows is left as written. */
function labelled(line: string): string {
  const m = LABEL.exec(line)
  return m ? `**${m[1]}**${line.slice((m[1] ?? '').length)}` : line
}

/** The HTML for text, notices left in the text as plain paragraphs (for the editor's "Add formatting"). Empty text gives ''. */
export const textToHtml = (text: string): string => textToParas(text).map((p) => (p.kind ? `<p>${p.html}</p>` : p.html)).join('')

/** True when the HTML is more than what `<p>` + escaped text would show: a list, a link, bold, several paragraphs or a line break. */
export const needsFormatting = (paras: Para[]) => paras.length > 1 || paras.some((p) => p.kind || !/^<p>[^<]*<\/p>$/.test(p.html))

/** HTML back to text with `<br/>`, for switching a block to a plain style. Bold, italic and links lose their marks (a link keeps its address). */
export function htmlToText(html: string): string {
  return html
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '<br/>')
    .replace(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (_, href: string, label: string) => (label.replace(/<[^>]*>/g, '') === href.replace(/^mailto:|^tel:/, '') ? label : `${label} (${href})`))
    .replace(/<br\s*\/?>/gi, '<br/>')
    .replace(/<\/(p|ul|ol)>/gi, '\u0000')
    .replace(/<(?!br\/>)[^>]*>/g, '')
    .split('\u0000')
    .map((block) => block.replace(/^(<br\/>)+|(<br\/>)+$/g, ''))
    .filter(Boolean)
    .join('<br/><br/>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}
