import { atom } from "jotai"

/**
 * Counts the times the CV's name has started its reveal. Each new value sends
 * one sweep of light across the page background.
 */
export const lightSweepAtom = atom(0)
