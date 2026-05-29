"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import { useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"

const THEME_STORAGE_KEY = "transactions-dashboard-theme"

const THEMES = {
  DARK: "dark",
  LIGHT: "light",
} as const

type Theme = (typeof THEMES)[keyof typeof THEMES]
type ThemeSnapshot = Theme | "unknown"

const THEME_CHANGE_EVENT = "transactions-dashboard-theme-change"

function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  )
  const hasHydratedTheme = theme !== "unknown"
  const isDark = theme === THEMES.DARK
  const nextTheme =
    hasHydratedTheme && isDark ? THEMES.LIGHT : THEMES.DARK
  const buttonLabel = hasHydratedTheme
    ? isDark
      ? "Light mode"
      : "Dark mode"
    : "Theme"
  const ariaLabel = hasHydratedTheme
    ? `Switch to ${nextTheme} theme`
    : "Theme mode"

  function onToggleTheme() {
    applyNextTheme(nextTheme)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={ariaLabel}
      onClick={onToggleTheme}
    >
      {!hasHydratedTheme || !isDark ? (
        <MoonIcon data-icon="inline-start" />
      ) : (
        <SunIcon data-icon="inline-start" />
      )}
      {buttonLabel}
    </Button>
  )
}

function subscribeToTheme(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {}
  }

  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange)

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange)
  }
}

function getServerThemeSnapshot(): ThemeSnapshot {
  return "unknown"
}

function getThemeSnapshot(): Theme {
  if (typeof document === "undefined") {
    return THEMES.LIGHT
  }

  if (document.documentElement.classList.contains(THEMES.DARK)) {
    return THEMES.DARK
  }

  return getInitialBrowserTheme()
}

function getInitialBrowserTheme(): Theme {
  const storedTheme = readStoredTheme()

  if (storedTheme) {
    return storedTheme
  }

  if (typeof window.matchMedia !== "function") {
    return THEMES.LIGHT
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? THEMES.DARK
    : THEMES.LIGHT
}

function readStoredTheme(): Theme | undefined {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)

    if (storedTheme === THEMES.DARK || storedTheme === THEMES.LIGHT) {
      return storedTheme
    }
  } catch {
    return undefined
  }

  return undefined
}

function writeStoredTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    document.cookie = `${THEME_STORAGE_KEY}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`
  } catch {
    return
  }
}

function applyNextTheme(theme: Theme): void {
  applyTheme(theme)
  writeStoredTheme(theme)
  announceThemeChange()
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle(THEMES.DARK, theme === THEMES.DARK)
  document.documentElement.style.colorScheme = theme
}

function announceThemeChange(): void {
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
}

export { ThemeToggle }
