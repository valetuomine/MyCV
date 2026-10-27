import { useEffect, useRef, type PointerEvent } from "react"
import prefersReducedMotion from "./prefersReducedMotion"

/**
 * Moves a light that follows a mouse pointer over an element. The pointer's
 * position inside the element goes to its `--x` and `--y` CSS variables once
 * per frame, so moving the pointer doesn't re-render, and the
 * `bg-cv-field-glow` and `bg-cv-field-edge` utilities draw the light there.
 * Touch and reduced motion leave the variables alone.
 *
 * @returns The handler for the element's `onPointerEnter` and
 * `onPointerMove`.
 */
export default function usePointerLight(): (
  event: PointerEvent<HTMLElement>,
) => void {
  const frameRef = useRef(0)

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  return (event) => {
    if (event.pointerType !== "mouse" || prefersReducedMotion()) {
      return
    }

    const element = event.currentTarget
    const { clientX, clientY } = event
    cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      const bounds = element.getBoundingClientRect()
      element.style.setProperty("--x", `${clientX - bounds.left}px`)
      element.style.setProperty("--y", `${clientY - bounds.top}px`)
    })
  }
}
