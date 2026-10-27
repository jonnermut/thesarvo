import { useEffect, useRef, useState } from 'react'
import { imageUrl } from '#/guide/content/paths'
import { fetchImageNames } from '#/guide/server'
import { Button } from './fields'
import { PhotoEditor } from './PhotoEditor'
import { fetchPhoto, isHeicFile, prepareImage, uploadImage } from './upload'

type Upload = { id: number; file: File; progress: number; error?: string }

/**
 * Choose a photo for a new topo: pick from the guide's images or add new ones by
 * dragging, pasting, the file dialog or (on phones) the camera. A single new photo opens the photo editor first.
 */
export function ImagePicker({ guideId, onPick, onClose }: { guideId: string; onPick: (name: string) => void; onClose: () => void }) {
  const [names, setNames] = useState<string[]>([])
  const [uploads, setUploads] = useState<Upload[]>([])
  const [dragging, setDragging] = useState(false)
  const [editing, setEditing] = useState<{ file: File; fromCamera: boolean } | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const nextId = useRef(0)
  // Phones and tablets: a button straight to the rear camera (the file dialog offers it too, one tap further).
  const [touch] = useState(() => matchMedia('(pointer: coarse)').matches)

  useEffect(() => {
    void fetchImageNames({ data: guideId }).then(setNames)
  }, [guideId])

  const patch = (id: number, change: Partial<Upload>) => setUploads((all) => all.map((u) => (u.id === id ? { ...u, ...change } : u)))

  const send = (file: File, prepare: (file: File) => Promise<File>) => {
    const id = nextId.current++
    setUploads((all) => [...all, { id, file, progress: 0 }])
    void prepare(file)
      .then((ready) => uploadImage(guideId, ready, (progress) => patch(id, { progress })))
      .then((name) => {
        setNames((all) => (all.includes(name) ? all : [...all, name].sort()))
        setUploads((all) => all.filter((u) => u.id !== id))
      })
      .catch((e: unknown) => patch(id, { error: e instanceof Error ? e.message : 'Failed' }))
  }

  // One photo opens the editor first; a batch goes straight up, upright, shrunk and sharpened.
  const add = (files: Iterable<File>, fromCamera = false) => {
    const images = [...files].filter((f) => f.type.startsWith('image/') || isHeicFile(f))
    if (images.length === 1 && images[0].type !== 'image/gif') setEditing({ file: images[0], fromCamera })
    else for (const file of images) send(file, prepareImage)
  }

  // Paste a screenshot or copied photo anywhere while the picker is open.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => add(e.clipboardData?.files ?? [])
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  return (
    <div
      className={`w-full rounded-xl border-2 border-dashed p-3 transition-colors ${dragging ? 'border-amber bg-amber/10' : 'border-line'}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        add(e.dataTransfer.files)
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Choose a photo, or drop, paste or add new ones</span>
        <Button variant="primary" onClick={() => input.current?.click()}>
          Add photos…
        </Button>
        {touch && (
          <Button variant="primary" onClick={() => camera.current?.click()}>
            Take photo
          </Button>
        )}
        <Button className="ml-auto" onClick={onClose}>
          Cancel
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          hidden
          onChange={(e) => {
            add(e.target.files ?? [])
            e.target.value = ''
          }}
        />
        <input
          ref={camera}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            add(e.target.files ?? [], true)
            e.target.value = ''
          }}
        />
        {editing && (
          <PhotoEditor
            file={editing.file}
            onCancel={() => setEditing(null)}
            onDone={({ file }) => {
              setEditing(null)
              send(file, async (ready) => ready)
            }}
            // Still inside the tap, so the browser lets the camera open again.
            onRetake={
              editing.fromCamera
                ? () => {
                    setEditing(null)
                    camera.current?.click()
                  }
                : undefined
            }
          />
        )}
      </div>

      {uploads.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {uploads.map((u) => (
            <li key={u.id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate">{u.file.name}</span>
              {u.error ? (
                <span className="text-red-700">{u.error}</span>
              ) : (
                <progress className="h-2 w-28" value={u.progress} max={1} />
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {names.map((name) => (
          <div key={name} className="relative">
            <button
              type="button"
              onClick={() => onPick(name)}
              className="group block w-full overflow-hidden rounded-lg border border-line bg-card text-left hover:border-amber"
            >
              <img src={imageUrl(guideId, name)} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <span className="block truncate px-2 py-1 text-xs text-muted group-hover:text-ink">{name}</span>
            </button>
            {/* Edits a copy: the original stays, for the topos that use it. */}
            <Button
              className="absolute top-1 right-1 bg-white/90! shadow-sm"
              aria-label={`Edit a copy of ${name}`}
              onClick={() =>
                void fetchPhoto(guideId, name)
                  .then((file) => setEditing({ file, fromCamera: false }))
                  .catch((e: unknown) => setUploads((all) => [...all, { id: nextId.current++, file: new File([], name), progress: 0, error: e instanceof Error ? e.message : 'Failed' }]))
              }
            >
              Edit
            </Button>
          </div>
        ))}
        {!names.length && <p className="col-span-full text-sm text-muted">No photos yet for this guide.</p>}
      </div>
    </div>
  )
}
