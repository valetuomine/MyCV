import { atom } from "jotai"

/** The most echoes that run at once; a new one replaces the oldest. */
export const maxEchoes = 4

/**
 * The latest echo that the CV's name sent into the background's light, as a
 * number that is new for every echo. `useNameWeightPlay` writes it when the
 * name's reveal starts and when the name is clicked or tapped, and sets it back
 * to null when the name leaves the page, so `DotEcho` also knows when the CV
 * is showing.
 */
export const nameEchoAtom = atom<number | null>(null)
