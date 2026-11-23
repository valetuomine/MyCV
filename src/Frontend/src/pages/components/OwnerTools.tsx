import { use, type JSX, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { OwnerToolsSlotContext } from "./ownerToolsSlot"

interface OwnerToolsProps {
  children: ReactNode
}

/**
 * Places the owner's tools in the page's top corner, before the sign-out,
 * while the component that renders them stays their owner: their state,
 * refs and `autoFocus` work as if they were rendered in place, and they
 * leave the corner when that component unmounts. The corner's slot exists
 * only while the signed-in account shows in `PageControls`, so without an
 * account nothing renders.
 *
 * @param props - The component props.
 * @param props.children - The tools to place.
 * @returns The tools in the page controls, or null while the controls
 *   have no slot for them.
 */
export default function OwnerTools({
  children,
}: Readonly<OwnerToolsProps>): JSX.Element | null {
  const slot = use(OwnerToolsSlotContext)

  return slot ? createPortal(children, slot) : null
}
