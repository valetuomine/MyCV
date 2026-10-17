import {
  m as motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion"
import { useState, type JSX, type PointerEvent } from "react"

interface ProfilePortraitProps {
  fullName?: string | null
  initials: string
  imageUrl?: string | null
}

const maxTiltDeg = 6
const tiltSpring = { stiffness: 150, damping: 18 }

// Shows the profile photo when one exists, otherwise a monogram placeholder.
// With a mouse, the card tilts toward the pointer and a soft glare follows it.
export default function ProfilePortrait({
  fullName,
  initials,
  imageUrl,
}: ProfilePortraitProps): JSX.Element {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showImage = Boolean(imageUrl) && failedUrl !== imageUrl
  const prefersReducedMotion = useReducedMotion()
  const rotateX = useSpring(0, tiltSpring)
  const rotateY = useSpring(0, tiltSpring)
  const glareX = useMotionValue(0)
  const glareY = useMotionValue(0)

  // Measured on the untransformed wrapper so the tilt never skews the bounds.
  const tilt = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType !== "mouse" || prefersReducedMotion) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const offsetX = event.clientX - bounds.left
    const offsetY = event.clientY - bounds.top
    rotateY.set((offsetX / bounds.width - 0.5) * 2 * maxTiltDeg)
    rotateX.set((0.5 - offsetY / bounds.height) * 2 * maxTiltDeg)
    glareX.set(offsetX)
    glareY.set(offsetY)
  }

  const resetTilt = (): void => {
    rotateX.set(0)
    rotateY.set(0)
  }

  return (
    <div
      onPointerMove={tilt}
      onPointerLeave={resetTilt}
      className="group w-full perspective-[1000px]"
    >
      <motion.div
        style={{ rotateX, rotateY }}
        className="relative overflow-hidden rounded-3xl bg-cv-line p-px shadow-cv-panel will-change-transform"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[200%] -translate-1/2 bg-cv-sweep animate-cv-sweep motion-reduce:hidden print:hidden"
        />
        <div
          className={`relative w-full overflow-hidden rounded-[calc(1.5rem-1px)] bg-cv-surface ${showImage ? "h-[clamp(20rem,68dvh,40rem)]" : "h-[clamp(16rem,46dvh,26rem)]"}`}
        >
          {showImage ? (
            <img
              src={imageUrl ?? undefined}
              alt={fullName ? `Portrait of ${fullName}` : "Profile portrait"}
              onError={() => setFailedUrl(imageUrl ?? null)}
              className="size-full object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="grid size-full place-items-center bg-linear-to-br from-cv-accent/20 via-transparent to-transparent"
            >
              <span className="font-cv-display text-[clamp(4.5rem,12vw,8rem)] leading-none font-semibold tracking-tighter text-cv-accent/80">
                {initials}
              </span>
            </div>
          )}
          <motion.div
            aria-hidden="true"
            style={{ x: glareX, y: glareY }}
            className={`pointer-events-none absolute top-0 left-0 -mt-40 -ml-40 size-80 bg-cv-glow opacity-0 transition-opacity duration-300 motion-reduce:hidden ${showImage ? "mix-blend-overlay [--glow:#fff] group-hover:opacity-40" : "group-hover:opacity-25"}`}
          />
        </div>
      </motion.div>
    </div>
  )
}
