import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import type { PercentCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { useEscape, useScrollLock } from '#/components/overlay'
import { Button, CheckField } from './fields'
import { autoTone, fitEdge, jpegName, MAX_EDGE, NO_TONE, preview, renderEdit, toJpeg, toneFilter, WHOLE, workCopy } from './photoEdit'
import type { PhotoEdit, Tone } from './photoEdit'
import { decode } from './upload'

/** Crop shapes: 0 is free, -1 the photo's own shape. */
const SHAPES = [
  ['Free', 0],
  ['Original', -1],
  ['4:3', 4 / 3],
  ['3:4', 3 / 4],
  ['16:9', 16 / 9],
  ['Square', 1],
] as const
const MAX_TILT = 15
const FULL: PercentCrop = { unit: '%', x: 0, y: 0, width: 100, height: 100 }

/** The edited photo, what was done to it, and its size in pixels. */
export type EditedPhoto = { file: File; edit: PhotoEdit; width: number; height: number }

/**
 * Before a photo goes up: turn it, straighten it, crop it, adjust its tone and sharpen it. Works on a copy of at most
 * 4096 pixels, so phone photos of any size stay within the browser's canvas limits. `onRetake` (camera photos) throws
 * this one away and opens the camera again. `onDone` may be async; the editor stays open, busy, until it finishes.
 */
export function PhotoEditor({
  file,
  onDone,
  onCancel,
  onRetake,
}: {
  file: File
  onDone: (photo: EditedPhoto) => void | Promise<void>
  onCancel: () => void
  onRetake?: () => void
}) {
  useScrollLock(true)
  useEscape(true, onCancel)
  const [upright, setUpright] = useState<HTMLCanvasElement | null>(null)
  const [error, setError] = useState('')
  const [turns, setTurns] = useState(0)
  const [tilt, setTilt] = useState(0)
  const [shape, setShape] = useState(0)
  const [crop, setCrop] = useState<PercentCrop>(FULL)
  const [tone, setTone] = useState<Tone>(NO_TONE)
  const [sharpen, setSharpen] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    decode(file)
      .then((bitmap) => {
        if (live) setUpright(workCopy(bitmap))
        bitmap.close()
      })
      .catch(() => setError('This photo could not be read. Try sharing it as JPEG.'))
    return () => {
      live = false
    }
  }, [file])

  const shown = useMemo(() => upright && preview(upright, turns, tilt), [upright, turns, tilt])
  const url = useCanvasUrl(shown)
  const ratio = shown ? shown.width / shown.height : 1
  const aspect = SHAPES[shape][1] === -1 ? ratio : SHAPES[shape][1] || undefined

  // The largest crop of the chosen shape, centred; the whole photo when the shape is free.
  const reset = (to: number | undefined, w: number, h: number) =>
    setCrop(to ? centerCrop(makeAspectCrop({ unit: '%', ...(to > w / h ? { width: 100 } : { height: 100 }) }, to, w, h), w, h) : FULL)

  const turn = (by: 1 | -1) => {
    const next = (turns + by + 4) % 4
    setTurns(next)
    // A quarter turn swaps the photo's sides.
    if (shown) reset(SHAPES[shape][1] === -1 ? shown.height / shown.width : aspect, shown.height, shown.width)
  }

  const pickShape = (i: number) => {
    setShape(i)
    if (shown) reset(SHAPES[i][1] === -1 ? ratio : SHAPES[i][1] || undefined, shown.width, shown.height)
  }

  const auto = () => {
    const ctx = shown?.getContext('2d')
    if (shown && ctx) setTone((t) => ({ ...t, ...autoTone(ctx.getImageData(0, 0, shown.width, shown.height).data) }))
  }

  const finish = async () => {
    if (!upright) return
    setBusy(true)
    try {
      const area = crop.width && crop.height ? { x: crop.x / 100, y: crop.y / 100, width: crop.width / 100, height: crop.height / 100 } : WHOLE
      const edit: PhotoEdit = { turns, tilt, crop: area, tone }
      const full = renderEdit(upright, edit)
      const blob = await toJpeg(full, sharpen, tone)
      await onDone({ file: new File([blob], jpegName(file.name), { type: 'image/jpeg' }), edit, ...fitEdge(full.width, full.height, MAX_EDGE) })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not edit the photo')
      setBusy(false)
    }
  }

  const percent = (v: number) => `${Math.round(v * 100)}%`
  const toneSlider = (key: keyof Tone, label: string, min: number, max: number) => (
    <Slider label={`${label} ${percent(tone[key])}`} min={min} max={max} step={0.01} value={tone[key]} onChange={(v) => setTone((t) => ({ ...t, [key]: v }))} onReset={() => setTone((t) => ({ ...t, [key]: 1 }))} />
  )

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-label="Edit photo" className="flex max-h-dvh w-full max-w-4xl flex-col gap-3 overflow-y-auto bg-white p-3 shadow-xl sm:rounded-lg sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="mr-auto font-semibold">Edit photo</h3>
          <Button onClick={onCancel}>Cancel</Button>
          {onRetake && <Button onClick={onRetake}>Retake</Button>}
          <Button variant="primary" disabled={!upright || busy} onClick={() => void finish()}>
            {busy ? 'Saving…' : 'Upload'}
          </Button>
        </div>

        {/* The padding leaves room for the crop handles, which stick out past the photo's edges. */}
        <div className="flex h-[50dvh] min-h-60 items-center justify-center overflow-hidden rounded bg-neutral-900 p-4">
          {url ? (
            <ReactCrop crop={crop} aspect={aspect} keepSelection ruleOfThirds minWidth={24} minHeight={24} onChange={(_, pc) => setCrop(pc)}>
              <img src={url} alt="Photo being edited" className="block max-h-[calc(50dvh-2rem)] max-w-full" style={{ filter: toneFilter(tone) }} />
            </ReactCrop>
          ) : (
            <p className="p-4 text-sm text-white/80">{error || 'Opening photo…'}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => turn(-1)} aria-label="Rotate left">
            ⟲ Left
          </Button>
          <Button onClick={() => turn(1)} aria-label="Rotate right">
            ⟳ Right
          </Button>
          <span className="ml-2 text-xs text-muted">Crop</span>
          {SHAPES.map(([label], i) => (
            <Button key={label} variant={shape === i ? 'primary' : 'plain'} aria-pressed={shape === i} onClick={() => pickShape(i)}>
              {label}
            </Button>
          ))}
        </div>

        <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
          <Slider label={`Straighten ${tilt > 0 ? '+' : ''}${tilt.toFixed(1)}°`} min={-MAX_TILT} max={MAX_TILT} step={0.1} value={tilt} onChange={setTilt} onReset={() => setTilt(0)} />
          {toneSlider('brightness', 'Brightness', 0.5, 2)}
          {toneSlider('contrast', 'Contrast', 0.5, 2)}
          {toneSlider('saturation', 'Saturation', 0, 2)}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button onClick={auto} disabled={!shown} title="Stretch the tones to the full range: lifts hazy, flat or dark photos">
            Auto tone
          </Button>
          <CheckField label="Sharpen" checked={sharpen} onChange={setSharpen} />
          <span className="text-xs text-muted">Saved as JPEG, at most {MAX_EDGE} pixels across. Drag the corners or edges to crop.</span>
          {error && url && <span className="text-sm text-red-700">{error}</span>}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Slider({ label, onChange, onReset, ...range }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; onReset: () => void }) {
  return (
    <label className="block text-xs text-muted">
      <span className="flex justify-between">
        {label}
        <button type="button" className="text-link" onClick={onReset}>
          Reset
        </button>
      </span>
      <input type="range" className="w-full accent-amber" {...range} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}

/** An object URL showing the canvas. The previous one stays up until the next is ready, so sliders don't flicker. */
function useCanvasUrl(canvas: HTMLCanvasElement | null) {
  const [url, setUrl] = useState<string | null>(null)
  const latest = useRef<string | null>(null)
  useEffect(() => {
    if (!canvas) return
    let live = true
    canvas.toBlob(
      (blob) => {
        if (!blob || !live) return
        if (latest.current) URL.revokeObjectURL(latest.current)
        setUrl((latest.current = URL.createObjectURL(blob)))
      },
      'image/jpeg',
      0.9,
    )
    return () => {
      live = false
    }
  }, [canvas])
  useEffect(() => () => void (latest.current && URL.revokeObjectURL(latest.current)), [])
  return url
}
