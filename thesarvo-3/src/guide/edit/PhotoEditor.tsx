import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { useEscape, useScrollLock } from '#/components/overlay'
import { Button, CheckField } from './fields'
import { coverZoom, jpegName, MAX_EDGE, quarterTurn, renderCrop, toJpeg } from './photoEdit'
import { decode } from './upload'

const SHAPES = [
  ['Original', 0],
  ['4:3', 4 / 3],
  ['3:4', 3 / 4],
  ['16:9', 16 / 9],
  ['Square', 1],
] as const
const MAX_TILT = 15

/**
 * Before a photo goes up: turn it, straighten it, crop it and sharpen it. Works on an upright copy of at most 4096
 * pixels, so phone photos of any size stay within the browser's canvas limits. `onRetake` (camera photos) throws this
 * one away and opens the camera again.
 */
export function PhotoEditor({ file, onDone, onCancel, onRetake }: { file: File; onDone: (file: File) => void; onCancel: () => void; onRetake?: () => void }) {
  useScrollLock(true)
  useEscape(true, onCancel)
  const [upright, setUpright] = useState<HTMLCanvasElement | null>(null)
  const [error, setError] = useState('')
  const [turns, setTurns] = useState(0)
  const [tilt, setTilt] = useState(0)
  const [shape, setShape] = useState(0)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [sharpen, setSharpen] = useState(true)
  const [busy, setBusy] = useState(false)
  const area = useRef<Area | null>(null)

  useEffect(() => {
    let live = true
    decode(file)
      .then((bitmap) => {
        if (live) setUpright(quarterTurn(bitmap, 0))
        bitmap.close()
      })
      .catch(() => setError('This photo could not be read. Try sharing it as JPEG.'))
    return () => {
      live = false
    }
  }, [file])

  const turned = useMemo(() => upright && quarterTurn(upright, turns), [upright, turns])
  const url = useCanvasUrl(turned)
  const aspect = turned ? SHAPES[shape][1] || turned.width / turned.height : 1
  const minZoom = turned ? coverZoom(turned.width, turned.height, tilt, aspect) : 1

  const turn = (by: 1 | -1) => {
    setTurns((t) => (t + by + 4) % 4)
    setCrop({ x: 0, y: 0 })
  }

  const finish = async () => {
    if (!turned) return
    setBusy(true)
    try {
      const cropped = renderCrop(turned, tilt, area.current ?? { x: 0, y: 0, width: turned.width, height: turned.height })
      onDone(new File([await toJpeg(cropped, sharpen)], jpegName(file.name), { type: 'image/jpeg' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not edit the photo')
      setBusy(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-label="Edit photo" className="flex max-h-dvh w-full max-w-4xl flex-col gap-3 overflow-y-auto bg-white p-3 shadow-xl sm:rounded-lg sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="mr-auto font-semibold">Edit photo</h3>
          <Button onClick={onCancel}>Cancel</Button>
          {onRetake && <Button onClick={onRetake}>Retake</Button>}
          <Button variant="primary" disabled={!turned || busy} onClick={() => void finish()}>
            {busy ? 'Preparing…' : 'Upload'}
          </Button>
        </div>

        <div className="relative h-[50dvh] min-h-60 overflow-hidden rounded bg-neutral-900">
          {url && (
            <Cropper
              image={url}
              crop={crop}
              zoom={Math.max(zoom, minZoom)}
              minZoom={minZoom}
              maxZoom={minZoom * 5}
              rotation={tilt}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => (area.current = pixels)}
            />
          )}
          {!url && <p className="p-4 text-sm text-white/80">{error || 'Opening photo…'}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => turn(-1)} aria-label="Rotate left">
            ⟲ Left
          </Button>
          <Button onClick={() => turn(1)} aria-label="Rotate right">
            ⟳ Right
          </Button>
          <span className="ml-2 text-xs text-muted">Shape</span>
          {SHAPES.map(([label], i) => (
            <Button key={label} variant={shape === i ? 'primary' : 'plain'} aria-pressed={shape === i} onClick={() => setShape(i)}>
              {label}
            </Button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Slider label={`Straighten ${tilt > 0 ? '+' : ''}${tilt.toFixed(1)}°`} min={-MAX_TILT} max={MAX_TILT} step={0.1} value={tilt} onChange={setTilt} onReset={() => setTilt(0)} />
          <Slider label="Zoom" min={minZoom} max={minZoom * 5} step={0.01} value={Math.max(zoom, minZoom)} onChange={setZoom} onReset={() => setZoom(minZoom)} />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <CheckField label="Sharpen" checked={sharpen} onChange={setSharpen} />
          <span className="text-xs text-muted">Saved as JPEG, at most {MAX_EDGE} pixels across. Pinch or scroll to zoom, drag to move.</span>
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

/** An object URL showing the canvas, revoked when it changes. */
function useCanvasUrl(canvas: HTMLCanvasElement | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!canvas) return
    let made: string | undefined
    let live = true
    canvas.toBlob(
      (blob) => {
        if (!blob || !live) return
        made = URL.createObjectURL(blob)
        setUrl(made)
      },
      'image/jpeg',
      0.92,
    )
    return () => {
      live = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [canvas])
  return url
}
