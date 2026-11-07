import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { sanitizeHtml } from './sanitize'

const pages = path.resolve(__dirname, '../../../../thesarvo-content/pages')

const text = (h: string) => h.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
const count = (h: string, what: string) => h.split(what).length - 1

describe.skipIf(!existsSync(pages))("the content repo's prose pages", () => {
  it('keep their text, links and pictures through the sanitiser, so saving a page from the editor loses nothing', () => {
    for (const id of readdirSync(pages)) {
      const file = path.join(pages, id, 'page.html')
      if (!existsSync(file)) continue
      const html = readFileSync(file, 'utf8')
      const clean = sanitizeHtml(html)
      // Not kept: heading ids (anchors) and pictures hot-linked over plain http.
      expect([id, text(clean)]).toEqual([id, text(html)])
      for (const what of [' data-page="', ' data-file="', ' href="']) expect([id, what, count(clean, what)]).toEqual([id, what, count(html, what)])
    }
  })
})
