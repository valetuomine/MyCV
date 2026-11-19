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
 * A let-go that comes before the hold is taken keeps it from being taken at
 * all. A child's effects run before its parent's, so a heading remounted
 * under a parent that has already animated in, such as the home page's
 * heading on a language switch, starts its reveal, and lets go, before this
 * layout effect runs; without this, the hold taken after it would keep the
 * light dark for good.
 *
 * @returns A function that lets go of the hold; calling it again does nothing.
 */
export default function useLightHold(): () => void {
  const setHolds = useSetAtom(directedLightAtom)
  const isHoldingRef = useRef(false)
  const isReleasedRef = useRef(false)

  /** Gives the hold back to `directedLightAtom`, if it is held. */
  const giveBack = useCallback((): void => {
    if (!isHoldingRef.current) {
      return
    }

    isHoldingRef.current = false
    setHolds((holds) => holds - 1)
  }, [setHolds])

  /**
   * Lets go of the hold, once, and keeps a hold that is not taken yet from
   * being taken.
   */
  const release = useCallback((): void => {
    isReleasedRef.current = true
    giveBack()
  }, [giveBack])

  useLayoutEffect(() => {
    if (isReleasedRef.current) {
      return
    }

    isHoldingRef.current = true
    setHolds((holds) => holds + 1)
    return giveBack
  }, [giveBack, setHolds])

  return release
}
