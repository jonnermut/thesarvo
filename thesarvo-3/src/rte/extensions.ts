import type { Extensions } from '@tiptap/core'
import { mergeAttributes, Node } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'
import { isEmbedSrc } from './embed'

/** A picture. Ones uploaded here (and the old pages') are kept by file name (`data-file`), which the host turns into an address: the editor shows them through `resolve`. */
export const Photo = Image.extend<{ resolve: (file: string) => string }>({
  addOptions() {
    return { ...this.parent?.(), inline: true, resolve: (file: string) => file }
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      file: { default: null, parseHTML: (el) => el.getAttribute('data-file'), renderHTML: () => ({}) },
    }
  },
  parseHTML() {
    return [{ tag: 'img[data-file]' }, { tag: 'img[src]:not([src^="data:"])' }]
  },
  renderHTML({ node }) {
    const { file, src, alt, width } = node.attrs as { file: string | null; src: string | null; alt: string | null; width: number | string | null }
    return ['img', { ...(file ? { 'data-file': file } : { src }), alt: alt ?? '', ...(width && { width }) }]
  },
  addNodeView() {
    return ({ node }) => {
      const img = document.createElement('img')
      const { file, src, alt } = node.attrs as { file: string | null; src: string | null; alt: string | null }
      img.src = file ? this.options.resolve(file) : (src ?? '')
      img.alt = alt ?? ''
      img.draggable = false
      return { dom: img }
    }
  },
})

/** Links also keep the old pages' `data-page` (a page by title) and `data-file` (an attachment), which the site resolves when it shows the page. */
const Anchor = Link.extend({
  addAttributes() {
    const keep = (name: string) => ({ default: null, parseHTML: (el: HTMLElement) => el.getAttribute(name), renderHTML: (a: Record<string, unknown>) => (a[name] ? { [name]: a[name] } : {}) })
    return { ...this.parent?.(), 'data-page': keep('data-page'), 'data-file': keep('data-file') }
  },
  parseHTML() {
    return [{ tag: 'a[href]' }, { tag: 'a[data-page]' }, { tag: 'a[data-file]' }]
  },
})

/** A note, a column set or a plain box of the old pages: a `div` holding blocks. */
export const Box = Node.create({
  name: 'box',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return { cls: { default: null, parseHTML: (el) => el.getAttribute('class'), renderHTML: (a) => (a.cls ? { class: a.cls } : {}) } }
  },
  parseHTML() {
    return [{ tag: 'div' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', HTMLAttributes, 0]
  },
})

/** A YouTube or Vimeo player in its frame. Only the player address is kept (see `embedUrl`). */
export const Embed = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  draggable: true,
  priority: 200,
  addAttributes() {
    return { src: { default: null } }
  },
  parseHTML() {
    return [
      {
        tag: 'div.embed',
        getAttrs: (el) => {
          const src = el.querySelector('iframe')?.getAttribute('src') ?? ''
          return isEmbedSrc(src) ? { src } : false
        },
      },
    ]
  },
  renderHTML({ node }) {
    return ['div', { class: 'embed' }, ['iframe', mergeAttributes({ src: node.attrs.src as string, title: 'Video', allowfullscreen: '' })]]
  },
})

export function extensions(options: { resolve: (file: string) => string; placeholder?: string; compact?: boolean }): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      codeBlock: false,
      code: false,
      link: false,
    }),
    Anchor.configure({ openOnClick: false, autolink: true, linkOnPaste: true, defaultProtocol: 'https', HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: null } }),
    Photo.configure({ resolve: options.resolve }),
    ...(options.compact ? [] : [Embed, Box, Table, TableRow, TableHeader, TableCell]),
    Placeholder.configure({ placeholder: options.placeholder ?? '' }),
  ]
}
