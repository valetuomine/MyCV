import { m as motion, useReducedMotion } from "framer-motion"
import type { JSX } from "react"

interface CopyBurstProps {
  trigger: number
}

const dotCount = 14

/**
 * Where each dot lands: spread around the circle with a slight jitter, at
 * uneven distances, flattened vertically to suit a wide pill, every third dot
 * a little larger.
 */
const burstDots = Array.from({ length: dotCount }, (_, index) => {
  const angle = (index / dotCount) * Math.PI * 2 + (index % 2 ? 0.2 : -0.1)
  const distance = 46 + ((index * 37) % 34)
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance * 0.75,
    size: index % 3 === 0 ? 7 : 5,
  }
})

/**
 * Sprays a small burst of accent dots from the centre of the control it sits
 * in. Each new `trigger` value remounts the burst, so it plays again. Hidden
 * from assistive technology, and not shown for reduced motion.
 *
 * @param props - The component props.
 * @param props.trigger - A counter that plays a fresh burst on each change;
 *   0 shows nothing.
 * @returns The burst, or null.
 */
export default function CopyBurst({
  trigger,
}: CopyBurstProps): JSX.Element | null {
  const prefersReducedMotion = useReducedMotion()
  if (prefersReducedMotion || trigger === 0) {
    return null
  }

  return (
    <span
      key={trigger}
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-1/2 print:hidden"
    >
      {burstDots.map((dot, index) => (
        <motion.span
          key={index}
          initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
          animate={{
            x: dot.x,
            y: dot.y,
            scale: [0.4, 1.1, 0.3],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 0.95,
            ease: [0.16, 1, 0.3, 1],
            delay: (index % 4) * 0.025,
            scale: { duration: 0.95, times: [0, 0.35, 1] },
            opacity: { duration: 0.95, times: [0, 0.55, 1] },
          }}
          style={{
            width: dot.size,
            height: dot.size,
            marginLeft: -dot.size / 2,
            marginTop: -dot.size / 2,
          }}
          className="absolute rounded-full bg-cv-accent"
        />
      ))}
    </span>
  )
}
