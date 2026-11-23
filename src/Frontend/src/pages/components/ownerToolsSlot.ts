import { createContext } from "react"

/**
 * Carries the element in `PageControls` that holds the owner's tools, so a
 * page deep in the tree, such as the CV view, can place a tool there with
 * `OwnerTools`. Null until the controls have mounted, and while no
 * signed-in account shows there.
 */
export const OwnerToolsSlotContext = createContext<HTMLElement | null>(null)
