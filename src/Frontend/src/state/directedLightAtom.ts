import { atom } from "jotai"

/**
 * The number of holds on the background's directed light. While it is above
 * zero, something on the page is waiting for the CV's reveal (`useLightHold`)
 * and the light stays dark; when the last hold is let go, the light comes on
 * from dark. Other pages never hold it, so their light is on from the start.
 */
export const directedLightAtom = atom(0)
