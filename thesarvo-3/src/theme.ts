import { useEffect, useState } from 'react'

/** "system" follows the browser's `prefers-color-scheme` (the CSS does that with no help); light and dark are the reader's own choice, kept in this browser and set as `data-theme` on <html>. */
export type Theme = 'system' | 'light' | 'dark'
export const THEMES: Theme[] = ['system', 'light', 'dark']
export const THEME_KEY = 'thesarvo.theme'

export const parseTheme = (v: string | null | undefined): Theme => (v === 'light' || v === 'dark' ? v : 'system')

/** Run in the <head> before first paint, so a chosen theme does not flash the other one. Kept as text because it is inlined; it is the same rule as `parseTheme`. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`

export function applyTheme(theme: Theme, doc: Document = document) {
  if (theme === 'system') delete doc.documentElement.dataset.theme
  else doc.documentElement.dataset.theme = theme
}

export function savedTheme(): Theme {
  try {
    return parseTheme(localStorage.getItem(THEME_KEY))
  } catch {
    return 'system'
  }
}

/** The reader's choice, read after mount (the page is built before anyone's choice is known); setting it applies and remembers it. */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>('system')
  useEffect(() => setTheme(savedTheme()), [])
  const set = (t: Theme) => {
    setTheme(t)
    applyTheme(t)
    try {
      if (t === 'system') localStorage.removeItem(THEME_KEY)
      else localStorage.setItem(THEME_KEY, t)
    } catch {
      /* storage unavailable: the choice lasts until the page closes */
    }
  }
  return [theme, set]
}
