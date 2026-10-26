import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEscape, usePresence, useScrollLock } from '#/components/overlay'
import type { Climb, ImageTopo } from '#/guide/model/types'
import { ClimbBlock } from './ClimbBlock'
import { Stars } from './Stars'
import { Topo } from './Topo'
import { TopoViewer } from './TopoViewer'
import { useSizedTopo } from './useSizedTopo'

type Props = {
  guideId: string
  topo: ImageTopo
  climbs: Map<string, Climb>
  active: string | null
  onActive: (climbId: string | null) => void
  onOpen?: (climbId: string) => void
  /**
   * The climbs below say the same as the legend: no box of it under the photo, and none on the photo
   * unless the old site drew it there (its `legend` flag). The full-screen viewer keeps it.
   */
  redundantLegend?: boolean
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

/**
 * Container widths at which a legend moves onto the photo, as [on photo, below photo] classes. Its
 * text is 10px at the photo's own size, so it is readable down to 80% of that; small photos never
 * get much smaller, so their legend stays on them. Literal classes, for Tailwind to find.
 */
const BREAKS = [
  [512, '@lg:block', '@lg:hidden'],
  [448, '@md:block', '@md:hidden'],
  [384, '@sm:block', '@sm:hidden'],
  [320, '@xs:block', '@xs:hidden'],
  [256, '@3xs:block', '@3xs:hidden'],
] as const
export const legendBreak = (width: number) => BREAKS.find(([at]) => at <= width * 0.8) ?? [0, 'block!', 'hidden']

/** The photo with route lines, plus the legend laid over it when the photo is wide enough to read it. */
function TopoCanvas({ legend, rows, ...props }: Props & { legend: Climb[]; rows: (compact: boolean) => React.ReactNode; displayWidth?: number }) {
  const { topo } = props
  return (
    <div className="relative">
      <Topo {...props} />
      {legend.length > 0 && (
        <div
          className={`absolute hidden rounded-lg bg-black/40 py-[0.3em] text-white ${legendBreak(topo.width)[1]}`}
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
function ClimbPopup({ climb, open, onClose }: { climb: Climb; open: boolean; onClose: () => void }) {
  useEscape(open, onClose)
  useScrollLock(open)
  return createPortal(
    <div
      className={`fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 transition-opacity duration-180 starting:opacity-0 ${open ? '' : 'pointer-events-none opacity-0'}`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={climb.name}
        className={`relative max-h-[80dvh] w-full max-w-lg overflow-auto overscroll-contain rounded-lg bg-card p-3 pr-8 shadow-xl transition-[translate] duration-180 ease-out starting:translate-y-3 ${open ? '' : 'translate-y-3'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" aria-label="Close" onClick={onClose} className="absolute right-2 top-1 text-2xl leading-none text-muted hover:text-navy">×</button>
        <ClimbBlock climb={climb} />
        <a href={`#c-${climb.id}`} onClick={onClose} className="mt-1 inline-block px-2 text-[13px] text-link hover:underline">Show in guide</a>
      </div>
    </div>,
    document.body,
  )
}

/**
 * Photo topo plus its legend. On wide photos the legend sits on the image like the live guide;
 * on narrow ones its text would be unreadably small, so it drops below the photo instead.
 */
export function TopoFigure({ topo: stored, redundantLegend, ...rest }: Props) {
  const topo = useSizedTopo(rest.guideId, stored)
  const props = { ...rest, topo }
  const { climbs, active, onActive } = props
  const [open, setOpen] = useState(false)
  const [popup, setPopup] = useState<string | null>(null)
  // The last climb shown stays on screen while its popup fades out.
  const [shownClimb, setShownClimb] = useState<Climb>()
  const popupClimb = popup ? climbs.get(popup) : undefined
  if (popupClimb && popupClimb !== shownClimb) setShownClimb(popupClimb)
  const popupMounted = usePresence(!!popupClimb)
  const closePopup = useCallback(() => setPopup(null), [])
  const closeViewer = useCallback(() => setOpen(false), [])
  const legend = topo.legend.map((id) => climbs.get(id)).filter((c): c is Climb => !!c)
  // Wide enough for the most stars in this legend on one line; "★★" wrapping looked like blank rows.
  const starsWidth = Math.max(1, ...legend.map((c) => c.stars.replace(/[^*]/g, '').length))

  const rows = (compact: boolean) =>
    legend.map((c) => (
      <li key={c.id} onPointerEnter={() => onActive(c.id)} onPointerLeave={() => onActive(null)}>
        <a
          href={`#c-${c.id}`}
          onClick={(e) => {
            e.preventDefault()
            setPopup(c.id)
          }}
          style={{ gridTemplateColumns: `${starsWidth}em 2.2em 1fr auto` }}
          className={`grid items-baseline gap-x-[0.5em] px-[0.4em] ${compact ? 'py-0' : 'py-1'} ${active === c.id ? 'bg-amber/60 text-black' : ''}`}
        >
          <span className="text-right whitespace-nowrap"><Stars stars={c.stars} /></span>
          <span className="text-right tabular-nums">{c.number}</span>
          <span className="truncate">{c.name}</span>
          <span className="tabular-nums">{c.grade.split('/')[0]}</span>
        </a>
      </li>
    ))

  return (
    <figure
      // Never scaled past the photo's own size: small old topos turn to mush when stretched to the page.
      style={{ maxWidth: topo.width }}
      className={`@container group relative my-3 print:break-inside-avoid ${printClasses(topo)}`}
    >
      <TopoCanvas {...props} onOpen={setPopup} legend={redundantLegend && topo.other?.legend !== 'true' ? [] : legend} rows={rows} />
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
      {legend.length > 0 && !redundantLegend && (
        <figcaption className={`${legendBreak(topo.width)[2]} mt-2 border border-line p-2 text-[13px]`}>
          {topo.legendTitle && <p className="mb-1 font-bold">{topo.legendTitle}</p>}
          <ol>{rows(false)}</ol>
        </figcaption>
      )}
      {topo.legendFooter && <p className="mt-1 text-[11px] text-muted">{topo.legendFooter}</p>}
      <TopoViewer width={topo.width} height={topo.height} open={open} onClose={closeViewer}>
        {(shownWidth) => <TopoCanvas {...props} onOpen={setPopup} legend={legend} rows={rows} displayWidth={shownWidth} />}
      </TopoViewer>
      {popupMounted && shownClimb && <ClimbPopup climb={shownClimb} open={!!popupClimb} onClose={closePopup} />}
    </figure>
  )
}
