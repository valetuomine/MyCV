import { atomWithStorage } from "jotai/utils"
import { Theme } from "../types"

export const themeStorageKey = "cv-theme"

/**
 * Reads the operating system's color scheme.
 *
 * @returns The dark theme when the system prefers dark, otherwise light.
 */
function getInitialTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? Theme.Dark
    : Theme.Light
}

/**
 * The active theme, saved in local storage. Reads the saved choice on init
 * and falls back to the operating system's preference.
 */
export const themeAtom = atomWithStorage<Theme>(
  themeStorageKey,
  getInitialTheme(),
  undefined,
  { getOnInit: true },
)
