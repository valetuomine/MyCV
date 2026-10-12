import {
  m as motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion"
import type { JSX, PointerEvent, ReactNode } from "react"
import SignOutButton from "../../auth/SignOutButton"
import ThemeToggle from "./ThemeToggle"

interface BackgroundProps {
  children: ReactNode
}

export default function Background({ children }: BackgroundProps): JSX.Element {
  const pointerX = useMotionValue(-1000)
  const pointerY = useMotionValue(-1000)
  const spotlightX = useSpring(pointerX, { stiffness: 100, damping: 20 })
  const spotlightY = useSpring(pointerY, { stiffness: 100, damping: 20 })
  const prefersReducedMotion = useReducedMotion()

  const trackPointer = (event: PointerEvent<HTMLElement>): void => {
    if (event.pointerType !== "mouse" || prefersReducedMotion) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    pointerX.set(event.clientX - bounds.left)
    pointerY.set(event.clientY - bounds.top)
  }

  return (
    <div
      onPointerMove={trackPointer}
      className="relative isolate min-h-dvh overflow-x-clip bg-cv-background text-cv-ink"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -top-48 left-[8%] size-176 bg-cv-glow opacity-10" />
        <div className="absolute -right-40 bottom-0 size-128 bg-cv-glow opacity-5 [--glow:var(--cv-copy)]" />
        <div className="absolute inset-0 bg-cv-grid" />
        <motion.div
          className="absolute top-0 left-0 -mt-[34rem] -ml-[34rem] size-[68rem] bg-cv-spotlight will-change-transform"
          style={{ x: spotlightX, y: spotlightY }}
        />
        <div className="absolute inset-0 bg-cv-grain opacity-[0.06]" />
      </div>
      <div className="relative z-10 min-h-dvh px-6 sm:px-[clamp(1.5rem,5vw,5.5rem)]">
        <div className="absolute top-5 right-6 z-20 flex items-start gap-2 sm:right-[clamp(1.5rem,5vw,5.5rem)]">
          <SignOutButton />
          <ThemeToggle />
        </div>
        {children}
      </div>
    </div>
  )
}
