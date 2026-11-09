import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { embedUrl } from './embed'
import { extensions } from './extensions'

export type RichEditorProps = {
  /** The HTML to start from. Read once: the editor owns the text after that. */
  initial: string
  onChange: (html: string) => void
  /** Stores one picture and resolves with the name it was kept under (shown through `resolveFile`, saved as `data-file`). */
  upload?: (file: File, onProgress: (fraction: number) => void) => Promise<string>
  /** The address a stored picture is shown from. */
  resolveFile?: (name: string) => string
  /** What the box is for, for screen readers. */
  label: string
  placeholder?: string
  /** A smaller toolbar and box, for comments: no headings, quotes, tables or video. */
  compact?: boolean
  /** Guide text (header fields, notices, rich text blocks): only paragraphs, bold, italic, lists and links, with a small toolbar and no pictures. */
  guide?: boolean
  autoFocus?: boolean
  /** Fired with the editor once it exists, for hosts that want to drive it (tests, a link picker). */
  onReady?: (editor: Editor) => void
}

const IMAGE = /^image\/(?:jpe?g|png|gif|webp|hei[cf])$/i

/** True when the HTML is just the empty paragraph an emptied editor leaves. */
const blank = (editor: Editor) => editor.isEmpty && !editor.getHTML().includes('<img')

/**
 * The rich text box for pages, forum posts and comments: formatting, links, pictures (drop, paste or pick) and video embeds.
 * Lazy loaded (see `LazyRichEditor`), so readers never download it. It holds no storage or network code of its own:
 * the host passes `upload` and `resolveFile`, and saves what `onChange` hands over.
 */
export default function RichEditor({ initial, onChange, upload, resolveFile, label, placeholder, compact, guide, autoFocus, onReady }: RichEditorProps) {
  const [uploads, setUploads] = useState<{ id: number; name: string; fraction: number }[]>([])
  const [problem, setProblem] = useState('')
  const next = useRef(0)
  const editorRef = useRef<Editor | null>(null)

  const addFiles = useCallback(
    async (files: File[]) => {
      setProblem('')
      for (const file of files) {
        if (!IMAGE.test(file.type) && !/\.hei[cf]$/i.test(file.name)) {
          setProblem(`${file.name} is not a picture (JPEG, PNG, GIF or WebP).`)
          continue
        }
        const id = next.current++
        setUploads((u) => [...u, { id, name: file.name, fraction: 0 }])
        try {
          const prepared = await (await import('#/guide/edit/upload')).prepareImage(file)
          if (!upload) return
          const stored = await upload(prepared, (fraction) => setUploads((u) => u.map((x) => (x.id === id ? { ...x, fraction } : x))))
          editorRef.current?.chain().focus().insertContent([{ type: 'image', attrs: { file: stored, alt: '' } }]).run()
        } catch (e) {
          setProblem(e instanceof Error ? e.message : 'The picture could not be added.')
        } finally {
          setUploads((u) => u.filter((x) => x.id !== id))
        }
      }
    },
    [upload],
  )

  const editor = useEditor({
    extensions: extensions({ resolve: resolveFile ?? ((f) => f), placeholder, compact, guide }),
    content: initial,
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: { class: `${guide ? 'guide-rich text-sm leading-snug' : 'page-prose'} rte-content px-3 py-2 focus:outline-none ${guide ? 'min-h-[5rem]' : compact ? 'min-h-[8rem]' : 'min-h-[8rem] min-h-[16rem]'}`, role: 'textbox', 'aria-multiline': 'true', 'aria-label': label },
      handlePaste: (_view, event) => {
        const files = [...(event.clipboardData?.files ?? [])].filter((f) => IMAGE.test(f.type))
        if (!files.length || !upload) return false
        event.preventDefault()
        void addFiles(files)
        return true
      },
      handleDrop: (_view, event) => {
        const files = [...(event.dataTransfer?.files ?? [])].filter((f) => IMAGE.test(f.type))
        if (!files.length || !upload) return false
        event.preventDefault()
        void addFiles(files)
        return true
      },
    },
    onUpdate: ({ editor: e }) => onChange(blank(e) ? '' : e.getHTML()),
    immediatelyRender: false,
  })
  editorRef.current = editor
  useEffect(() => {
    if (editor) onReady?.(editor)
  }, [editor, onReady])

  return (
    // Guide text keeps its toolbar out of the page until the box is being typed in: it floats in the label row above the box (see `RichField`).
    <div className={guide ? 'group relative' : undefined}>
    <div className="rte overflow-hidden rounded-md border border-line bg-card focus-within:border-link">
      {editor && !guide && <Toolbar editor={editor} compact={compact} onFiles={(files) => void addFiles(files)} />}
      <EditorContent editor={editor} />
      {uploads.length > 0 && (
        <ul className="border-t border-line px-3 py-1.5 text-sm text-muted" aria-live="polite">
          {uploads.map((u) => (
            <li key={u.id}>
              Adding {u.name}… {Math.round(u.fraction * 100)}%
            </li>
          ))}
        </ul>
      )}
      {problem && (
        <p role="alert" className="border-t border-line px-3 py-1.5 text-sm text-red-700">
          {problem}
        </p>
      )}
    </div>
    {editor && guide && <Toolbar editor={editor} guide onFiles={(files) => void addFiles(files)} />}
    </div>
  )
}

const btn = 'grid h-8 min-w-8 place-items-center rounded px-1.5 text-sm hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-link'
const smallBtn = 'grid h-7 min-w-7 place-items-center rounded px-1 text-sm hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-link'

function Tool({ label, active, disabled, small, onClick, children }: { label: string; active?: boolean; disabled?: boolean; small?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} aria-pressed={active} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick} className={`${small ? smallBtn : btn} ${active ? 'bg-paper font-semibold text-link' : ''} disabled:opacity-40`}>
      {children}
    </button>
  )
}

const Gap = () => <span aria-hidden className="mx-1 h-5 w-px bg-line" />

function Toolbar({ editor, compact, guide, onFiles }: { editor: Editor; compact?: boolean; guide?: boolean; onFiles: (files: File[]) => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bullets: e.isActive('bulletList'),
      numbers: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      link: e.isActive('link'),
      undo: e.can().undo(),
      redo: e.can().redo(),
    }),
  })
  const [panel, setPanel] = useState<'link' | 'video' | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const chain = () => editor.chain().focus()

  // Cmd/Ctrl+K opens the link box, as in most editors.
  useEffect(() => {
    const dom = editor.view.dom
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPanel('link')
      }
    }
    dom.addEventListener('keydown', key)
    return () => dom.removeEventListener('keydown', key)
  }, [editor])

  return (
    <div className={guide ? 'absolute -top-7 right-0 z-10 hidden group-focus-within:block' : 'border-b border-line'}>
      <div role="toolbar" aria-label="Formatting" className={guide ? 'flex items-center gap-px rounded-md border border-line bg-card px-0.5 shadow-sm' : 'flex flex-wrap items-center gap-0.5 px-1.5 py-1'}>
        <Tool small={guide} label="Bold (Ctrl+B)" active={s.bold} onClick={() => chain().toggleBold().run()}>
          <b>B</b>
        </Tool>
        <Tool small={guide} label="Italic (Ctrl+I)" active={s.italic} onClick={() => chain().toggleItalic().run()}>
          <i>I</i>
        </Tool>
        {!compact && !guide && (
          <>
            <Tool small={guide} label="Underline (Ctrl+U)" active={s.underline} onClick={() => chain().toggleUnderline().run()}>
              <u>U</u>
            </Tool>
            <Tool small={guide} label="Strikethrough" active={s.strike} onClick={() => chain().toggleStrike().run()}>
              <s>S</s>
            </Tool>
            <Gap />
            <Tool small={guide} label="Heading" active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
              H2
            </Tool>
            <Tool small={guide} label="Subheading" active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
              H3
            </Tool>
          </>
        )}
        <Gap />
        <Tool small={guide} label="Bulleted list" active={s.bullets} onClick={() => chain().toggleBulletList().run()}>
          •≡
        </Tool>
        <Tool small={guide} label="Numbered list" active={s.numbers} onClick={() => chain().toggleOrderedList().run()}>
          1.
        </Tool>
        {!compact && !guide && (
          <Tool small={guide} label="Quote" active={s.quote} onClick={() => chain().toggleBlockquote().run()}>
            “ ”
          </Tool>
        )}
        <Gap />
        <Tool small={guide} label="Link (Ctrl+K)" active={s.link || panel === 'link'} onClick={() => setPanel(panel === 'link' ? null : 'link')}>
          Link
        </Tool>
        {!guide && (
          <Tool small={guide} label="Add a picture" onClick={() => file.current?.click()}>
            Photo
          </Tool>
        )}
        {!compact && !guide && (
          <Tool small={guide} label="Embed a video" active={panel === 'video'} onClick={() => setPanel(panel === 'video' ? null : 'video')}>
            Video
          </Tool>
        )}
        {!compact && !guide && (
          <Tool small={guide} label="Divider" onClick={() => chain().setHorizontalRule().run()}>
            ―
          </Tool>
        )}
        {/* On a phone the floating guide toolbar would cover the label, so it drops undo and redo (the keyboard has them). */}
        <span className={guide ? 'hidden items-center gap-px sm:contents' : 'contents'}>
          <Gap />
          <Tool small={guide} label="Undo (Ctrl+Z)" disabled={!s.undo} onClick={() => chain().undo().run()}>
            ↶
          </Tool>
          <Tool small={guide} label="Redo (Ctrl+Shift+Z)" disabled={!s.redo} onClick={() => chain().redo().run()}>
            ↷
          </Tool>
        </span>
        <input
          ref={file}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          hidden
          onChange={(e) => {
            onFiles([...(e.target.files ?? [])])
            e.target.value = ''
          }}
        />
      </div>
      {panel && (
        <div className={guide ? 'absolute right-0 top-full z-20 mt-1 w-[min(20rem,calc(100vw-2rem))] rounded-md border border-line bg-card shadow-lg [&>form]:border-t-0' : undefined}>
          {panel === 'link' && <LinkBox editor={editor} onDone={() => setPanel(null)} />}
          {panel === 'video' && <VideoBox editor={editor} onDone={() => setPanel(null)} />}
        </div>
      )}
    </div>
  )
}

const input = 'min-w-0 flex-1 rounded-md border border-line bg-card px-2 py-1 focus:border-link focus:outline-none'
const small = 'rounded-md px-3 py-1 text-sm'

/** Where the selected text should link to; empty and Apply removes the link. Bare addresses get https://. */
function LinkBox({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const [href, setHref] = useState((editor.getAttributes('link').href as string | undefined) ?? '')
  const apply = () => {
    const url = href.trim()
    if (!url) editor.chain().focus().extendMarkRange('link').unsetLink().run()
    else {
      const full = /^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(url) ? url : `https://${url}`
      const { empty } = editor.state.selection
      if (empty && !editor.isActive('link')) editor.chain().focus().insertContent({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href: full } }] }).run()
      else editor.chain().focus().extendMarkRange('link').setLink({ href: full }).run()
    }
    onDone()
  }
  return (
    <form
      className="flex items-center gap-2 border-t border-line px-2 py-1.5"
      onSubmit={(e) => {
        e.preventDefault()
        apply()
      }}
    >
      <input autoFocus value={href} onChange={(e) => setHref(e.target.value)} placeholder="Paste or type an address" aria-label="Link address" className={input} />
      <button type="submit" className={`${small} bg-brand text-white`}>
        Apply
      </button>
      <button type="button" onClick={onDone} className={`${small} text-muted hover:underline`}>
        Cancel
      </button>
    </form>
  )
}

/** A YouTube or Vimeo address, put in as a player. */
function VideoBox({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const [url, setUrl] = useState('')
  const [bad, setBad] = useState(false)
  return (
    <form
      className="flex flex-wrap items-center gap-2 border-t border-line px-2 py-1.5"
      onSubmit={(e) => {
        e.preventDefault()
        const src = embedUrl(url)
        if (!src) return setBad(true)
        editor.chain().focus().insertContent({ type: 'embed', attrs: { src } }).run()
        onDone()
      }}
    >
      <input autoFocus value={url} onChange={(e) => (setUrl(e.target.value), setBad(false))} placeholder="YouTube or Vimeo address" aria-label="Video address" aria-invalid={bad} className={input} />
      <button type="submit" className={`${small} bg-brand text-white`}>
        Embed
      </button>
      <button type="button" onClick={onDone} className={`${small} text-muted hover:underline`}>
        Cancel
      </button>
      {bad && (
        <p role="alert" className="basis-full text-sm text-red-700">
          Only YouTube and Vimeo addresses can be embedded.
        </p>
      )}
    </form>
  )
}
