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
/**
 * Longer than any glyph outline at the monogram's 100-unit font size, so one
 * dash covers each outline before the gap reaches it.
 */
const initialsDash = 1000

/**
 * Shows the profile photo when one exists, otherwise a monogram placeholder
 * whose initials are traced in outline, then filled. With a mouse, the card
 * tilts toward the pointer and a soft glare follows it. In the stacked layout
 * it rises into place as it scrolls into view.
 *
 * @param props - The component props.
 * @param props.fullName - The candidate's name, for the photo's alt text.
 * @param props.initials - The monogram's initials.
 * @param props.imageUrl - The profile photo, if there is one.
 * @returns The portrait card.
 */
export default function ProfilePortrait({
  fullName,
  initials,
  imageUrl,
}: ProfilePortraitProps): JSX.Element {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  /** Shows the photo unless there is none or this URL failed to load. */
  const showImage = Boolean(imageUrl) && failedUrl !== imageUrl
  const prefersReducedMotion = useReducedMotion()
  const rotateX = useSpring(0, tiltSpring)
  const rotateY = useSpring(0, tiltSpring)
  const glareX = useMotionValue(0)
  const glareY = useMotionValue(0)

  /**
   * Tilts the card toward a mouse pointer and moves the glare under it.
   * Measured on the untransformed wrapper, so the tilt never skews the bounds.
   *
   * @param event - The pointer move over the card.
   */
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

  /** Springs the card back to level when the pointer leaves. */
  const resetTilt = (): void => {
    rotateX.set(0)
    rotateY.set(0)
  }

  return (
    <div
      onPointerMove={tilt}
      onPointerLeave={resetTilt}
      className="group w-full perspective-[1000px] max-lg:animate-cv-scroll-rise"
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
          className={`relative w-full overflow-hidden rounded-[calc(1.5rem-1px)] bg-cv-surface ${showImage ? "h-[clamp(20rem,68dvh,40rem)]" : "h-44 lg:h-[clamp(16rem,46dvh,26rem)]"}`}
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
              <svg
                viewBox="0 0 160 100"
                className="h-[1em] w-[1.6em] overflow-visible font-cv-display text-[clamp(4.5rem,12vw,8rem)] font-semibold tracking-tighter text-cv-accent select-none"
              >
                <motion.text
                  x="80"
                  y="50"
                  fontSize="100"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeDasharray={initialsDash}
                  initial={
                    prefersReducedMotion
                      ? false
                      : { strokeDashoffset: initialsDash, fillOpacity: 0 }
                  }
                  animate={{ strokeDashoffset: 0, fillOpacity: 0.8 }}
                  transition={{
                    strokeDashoffset: {
                      duration: 1.6,
                      ease: [0.65, 0, 0.35, 1],
                      delay: 0.5,
                    },
                    fillOpacity: { duration: 0.6, ease: "easeOut", delay: 1.6 },
                  }}
                >
                  {initials}
                </motion.text>
              </svg>
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
