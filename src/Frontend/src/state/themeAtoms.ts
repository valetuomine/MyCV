import { atomWithStorage } from "jotai/utils"
import { Theme } from "../types"

export const themeStorageKey = "cv-theme"

function getInitialTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? Theme.Dark
    : Theme.Light
}

// Reads the saved choice on init; falls back to the OS preference.
export const themeAtom = atomWithStorage<Theme>(
  themeStorageKey,
  getInitialTheme(),
  undefined,
  { getOnInit: true },
)
