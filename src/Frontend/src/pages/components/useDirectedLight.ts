import { useStore } from "jotai"
import { useLayoutEffect, useState } from "react"
import { directedLightAtom } from "../../state/directedLightAtom"

interface DirectedLight {
  isHeld: boolean
  hasBeenHeld: boolean
}

/**
 * Reads the state of the background's directed light for the page frame:
 * whether something holds it dark now (`useLightHold`), and whether anything
 * has held it since the frame mounted, which tells a light that was let go
 * from one that was never held. It follows `directedLightAtom` from a layout
 * effect instead of `useAtomValue` or `useSyncExternalStore`, which both start
 * following only after the first paint: a parent's layout effect runs after
 * its children's, so a hold that the CV's skeleton takes on the first render
 * is seen before that paint, and the light never shows for a frame before it
 * goes dark.
 *
 * @returns Whether the light is held, and whether it has ever been.
 */
export default function useDirectedLight(): DirectedLight {
  const store = useStore()
  const [light, setLight] = useState<DirectedLight>(() => {
    const isHeld = store.get(directedLightAtom) > 0
    return { isHeld, hasBeenHeld: isHeld }
  })

  useLayoutEffect(() => {
    /** Takes the atom's current holds into the frame's state. */
    const followLight = (): void => {
      const isHeld = store.get(directedLightAtom) > 0
      setLight((current) =>
        current.isHeld === isHeld
          ? current
          : { isHeld, hasBeenHeld: current.hasBeenHeld || isHeld },
      )
    }

    followLight()
    return store.sub(directedLightAtom, followLight)
  }, [store])

  return light
}
