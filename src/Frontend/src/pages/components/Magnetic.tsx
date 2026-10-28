import { m as motion, useReducedMotion, useSpring } from "framer-motion"
import type { JSX, PointerEvent, ReactNode } from "react"

interface MagneticProps {
  children: ReactNode
}

/** How far the control follows the pointer, as a share of its offset. */
const pull = 0.28
const pullSpring = { stiffness: 220, damping: 15, mass: 0.6 }

/**
 * Lets a control lean toward a mouse pointer while the pointer is over it,
 * by about a quarter of the pointer's offset from its centre, on a spring.
 * Touch and reduced motion leave it in place.
 *
 * @param props - The component props.
 * @param props.children - The control that leans.
 * @returns The control in a wrapper that follows the pointer.
 */
export default function Magnetic({ children }: MagneticProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion()
  const x = useSpring(0, pullSpring)
  const y = useSpring(0, pullSpring)

  /**
   * Pulls the control toward a mouse pointer, a little more vertically, so
   * the short side of a pill still moves visibly. The offset is measured from
   * where the control rests, without its current lean, so the pull doesn't
   * shrink as the control moves toward the pointer.
   *
   * @param event - The pointer move over the control.
   */
  const follow = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType !== "mouse" || prefersReducedMotion) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const restX = bounds.left + bounds.width / 2 - x.get()
    const restY = bounds.top + bounds.height / 2 - y.get()
    x.set((event.clientX - restX) * pull)
    y.set((event.clientY - restY) * pull * 1.4)
  }

  /** Springs the control back to its place when the pointer leaves. */
  const release = (): void => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      onPointerMove={follow}
      onPointerLeave={release}
      style={{ x, y }}
      className="inline-flex"
    >
      {children}
    </motion.div>
  )
}
