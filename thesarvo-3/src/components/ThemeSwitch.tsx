import { THEMES, useTheme } from '#/theme'
import type { Theme } from '#/theme'

const LABELS: Record<Theme, string> = { system: 'Auto', light: 'Light', dark: 'Dark' }

/** Follow the browser's light or dark setting (the default), or pick one. The choice is kept in this browser. */
export function ThemeSwitch() {
  const [theme, setTheme] = useTheme()
  return (
    <div role="group" aria-label="Colour theme" className="flex items-center gap-2">
      <span>Theme</span>
      <span className="inline-flex overflow-hidden rounded border border-line">
        {THEMES.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={theme === t}
            onClick={() => setTheme(t)}
            className={`px-2 py-0.5 ${theme === t ? 'bg-fill text-white' : 'bg-card text-navy hover:bg-wash/5'}`}
          >
            {LABELS[t]}
          </button>
        ))}
      </span>
    </div>
  )
}
