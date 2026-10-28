import { atom } from "jotai"

export interface NameEcho {
  id: number
  x: number
  y: number
}

/**
 * The latest echo that the CV's name sent into the background's dots: its
 * starting point in page coordinates and an ID that is new for every echo.
 * `useNameWeightPlay` writes it when the name's reveal ends and when the
 * name is clicked or tapped, and sets it back to null when the name leaves
 * the page, so `DotEcho` also knows when the CV is showing.
 */
export const nameEchoAtom = atom<NameEcho | null>(null)
