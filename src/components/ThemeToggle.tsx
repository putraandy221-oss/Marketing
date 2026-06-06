import { useEffect, useState } from 'react'

const THEME_STORAGE_KEY = 'fnb_theme'

type ThemeMode = 'light' | 'dark'

const getStoredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const applyTheme = (theme: ThemeMode) => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }
}

const ThemeToggle = () => {
  const [theme, setTheme] = useState<ThemeMode>('light')

  useEffect(() => {
    const initialTheme = getStoredTheme()
    setTheme(initialTheme)
    applyTheme(initialTheme)
  }, [])

  const handleToggle = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    applyTheme(nextTheme)
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="rounded-2xl bg-amber-100 px-3 py-2 text-sm font-medium text-orange-900 transition hover:bg-amber-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
    >
      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
    </button>
  )
}

export default ThemeToggle
