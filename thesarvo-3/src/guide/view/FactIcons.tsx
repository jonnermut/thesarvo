/** Walk / Sun / Rock icons for the guide header, traced from the live site's PNGs. */
import rock from './icons/rock.svg'
import sun from './icons/sun.svg'
import walk from './icons/walk.svg'

const icon = (src: string, label: string) =>
  function Icon() {
    return <img src={src} alt={label} width={64} height={64} className="size-16 shrink-0" />
  }

export const WalkIcon = icon(walk, 'Walk')
export const SunIcon = icon(sun, 'Sun')
export const RockIcon = icon(rock, 'Rock')
