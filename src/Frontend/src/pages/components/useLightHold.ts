import { useSetAtom } from "jotai"
import { useCallback, useLayoutEffect, useRef } from "react"
import { directedLightAtom } from "../../state/directedLightAtom"

/**
 * Keeps the background's directed light dark from the component's first paint
 * until it lets go or leaves the page, whichever comes first. The CV's skeleton
 * and the name before its reveal hold it, so the light comes on as the reveal
 * starts. The hold is taken in a layout effect, so the light never shows for a
 * frame in between, and a hold handed from one component to the next in the
 * same commit never lights it in between. Letting go of the last hold lights
 * the light (`directedLightAtom`).
 *
 * @returns A function that lets go of the hold; calling it again does nothing.
 */
export default function useLightHold(): () => void {
  const setHolds = useSetAtom(directedLightAtom)
  const isHoldingRef = useRef(false)

  /** Lets go of the hold, once. */
  const release = useCallback((): void => {
    if (!isHoldingRef.current) {
      return
    }

    isHoldingRef.current = false
    setHolds((holds) => holds - 1)
  }, [setHolds])

  useLayoutEffect(() => {
    isHoldingRef.current = true
    setHolds((holds) => holds + 1)
    return release
  }, [release, setHolds])

  return release
}
