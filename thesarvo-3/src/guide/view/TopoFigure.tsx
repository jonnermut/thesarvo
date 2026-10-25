import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Climb, ImageTopo } from '#/guide/model/types'
import { ClimbBlock } from './ClimbBlock'
import { Stars } from './Stars'
import { Topo } from './Topo'

type Props = {
  guideId: string
  topo: ImageTopo
  climbs: Map<string, Climb>
  active: string | null
  onActive: (climbId: string | null) => void
  onOpen?: (climbId: string) => void
}

/** Print options from the legacy editor. */
const hiddenInPrint = (topo: ImageTopo) => topo.noPrint || topo.printLayout === 'NotInPrint'

/** FitToPage fills a printed page by itself; the other layouts only steer the separate InDesign layout tool. */
const printClasses = (topo: ImageTopo) =>
  hiddenInPrint(topo)
    ? 'no-print'
    : topo.printLayout === 'FitToPage'
      ? 'print:break-before-page print:break-after-page print:mx-auto print:max-w-[18cm]'
      : ''

/** The photo with route lines, plus the legend laid over it when the photo is wide enough to read it. */
function TopoCanvas({ legend, rows, ...props }: Props & { legend: Climb[]; rows: (compact: boolean) => React.ReactNode }) {
  const { topo } = props
  return (
    <div className="relative">
      <Topo {...props} />
      {legend.length > 0 && (
        <div
          className="absolute hidden rounded-lg bg-black/40 py-[0.3em] text-white @lg:block"
          style={{
            left: `${(topo.legendX / topo.width) * 100}%`,
            top: `${(topo.legendY / topo.height) * 100}%`,
            fontSize: `${(10 / topo.width) * 100}cqw`,
            minWidth: '19%',
          }}
        >
          {topo.legendTitle && <p className="px-[0.6em] pb-[0.3em] text-center font-bold">{topo.legendTitle}</p>}
          <ol className="leading-[1.2]">{rows(true)}</ol>
        </div>
      )}
    </div>
  )
}

/** The climb behind a route or legend row, as a popup like the legacy topo's route popover. */
function ClimbPopup({ climb, onClose }: { climb: Climb; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div role="dialog" aria-label={climb.name} className="relative max-h-[80dvh] w-full max-w-lg overflow-auto rounded-lg bg-card p-3 pr-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label="Close" onClick={onClose} className="absolute right-2 top-1 text-2xl leading-none text-muted hover:text-navy">×</button>
        <ClimbBlock climb={climb} anchor={false} />
        <a href={`#climb-${climb.id}`} onClick={onClose} className="mt-1 inline-block px-2 text-[13px] text-link hover:underline">Show in guide</a>
      </div>
    </div>,
    document.body,
  )
}

/** Full-screen view: the photo can be larger than the screen and is scrolled (or pinch-zoomed) in place. */
function Enlarged({ onClose, ...canvas }: { onClose: () => void } & Parameters<typeof TopoCanvas>[0]) {
  const [zoom, setZoom] = useState(1)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const btn = 'rounded bg-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/25'
  // Portalled: the figure is a size container, which would otherwise become the containing block of `fixed`.
  return createPortal(
    <div role="dialog" aria-label="Topo" className="fixed inset-0 z-50 flex flex-col bg-black/90">
      <div className="flex items-center gap-2 p-2">
        <button type="button" className={btn} onClick={() => setZoom((z) => Math.max(1, z - 0.5))} aria-label="Zoom out">−</button>
        <button type="button" className={btn} onClick={() => setZoom((z) => Math.min(4, z + 0.5))} aria-label="Zoom in">+</button>
        <span className="text-sm text-white/70">{Math.round(zoom * 100)}%</span>
        <button type="button" className={`${btn} ml-auto`} onClick={onClose}>Close</button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="@container mx-auto" style={{ width: `${zoom * 100}%`, maxWidth: zoom === 1 ? `calc((100dvh - 4rem) * ${canvas.topo.width / canvas.topo.height})` : undefined }}>
          <TopoCanvas {...canvas} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

/**
 * Photo topo plus its legend. On wide photos the legend sits on the image like the live guide;
 * on narrow ones its text would be unreadably small, so it drops below the photo instead.
 */
export function TopoFigure(props: Props) {
  const { topo, climbs, active, onActive } = props
  const [open, setOpen] = useState(false)
  const [popup, setPopup] = useState<string | null>(null)
  const popupClimb = popup ? climbs.get(popup) : undefined
  const legend = topo.legend.map((id) => climbs.get(id)).filter((c): c is Climb => !!c)

  const rows = (compact: boolean) =>
    legend.map((c) => (
      <li key={c.id} onPointerEnter={() => onActive(c.id)} onPointerLeave={() => onActive(null)}>
        <a
          href={`#climb-${c.id}`}
          onClick={(e) => {
            e.preventDefault()
            setPopup(c.id)
          }}
          className={`grid grid-cols-[1.2em_2.2em_1fr_auto] items-baseline gap-x-[0.5em] px-[0.4em] ${compact ? 'py-0' : 'py-1'} ${active === c.id ? 'bg-amber/60 text-black' : ''}`}
        >
          <span className="text-center"><Stars stars={c.stars} /></span>
          <span className="text-right tabular-nums">{c.number}</span>
          <span className="truncate">{c.name}</span>
          <span className="tabular-nums">{c.grade.split('/')[0]}</span>
        </a>
      </li>
    ))

  return (
    <figure className={`@container group relative my-3 print:break-inside-avoid ${printClasses(topo)}`}>
      <TopoCanvas {...props} onOpen={setPopup} legend={legend} rows={rows} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Enlarge topo"
        className="no-print absolute right-2 top-2 grid size-9 place-items-center rounded-md bg-black/50 text-white hover:bg-black/70"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </svg>
      </button>
      {legend.length > 0 && (
        <figcaption className="@lg:hidden mt-2 border border-line p-2 text-[13px]">
          {topo.legendTitle && <p className="mb-1 font-bold">{topo.legendTitle}</p>}
          <ol>{rows(false)}</ol>
        </figcaption>
      )}
      {topo.legendFooter && <p className="mt-1 text-[11px] text-muted">{topo.legendFooter}</p>}
      {open && <Enlarged {...props} onOpen={setPopup} legend={legend} rows={rows} onClose={() => setOpen(false)} />}
      {popupClimb && <ClimbPopup climb={popupClimb} onClose={() => setPopup(null)} />}
    </figure>
  )
}
