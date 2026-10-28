import {
  animate,
  m as motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion"
import { useEffect, useState, type JSX, type PointerEvent } from "react"
import { useTranslation } from "react-i18next"

interface ProfilePortraitProps {
  fullName?: string | null
  initials: string
  imageUrl?: string | null
}

const maxTiltDeg = 11
const tiltSpring = { stiffness: 140, damping: 16 }
const hoverSpring = { stiffness: 120, damping: 20 }
/**
 * Longer than any glyph outline at the monogram's 100-unit font size, so one
 * dash covers each outline before the gap reaches it.
 */
const initialsDash = 1000
/** The monogram's size and type, shared by the initials and their shadow. */
const monogramClassName =
  "h-[1em] w-[1.6em] overflow-visible font-cv-display text-[clamp(4.5rem,12vw,8rem)] font-semibold tracking-tighter text-cv-accent select-none"
/** Thin accent and ink bands, the foil that slides across with the tilt. */
const foilBands =
  "repeating-linear-gradient(105deg, transparent 0%, color-mix(in srgb, var(--cv-accent) 14%, transparent) 4%, transparent 8%, color-mix(in srgb, var(--cv-ink) 6%, transparent) 10%, transparent 13%)"
/** When the traced initials fill in, which is also when their shadow lands. */
const fillTransition = { duration: 0.6, ease: "easeOut", delay: 1.6 } as const

/**
 * Shows the profile photo when one exists, otherwise a monogram placeholder
 * whose initials are traced in outline, then filled. The card behaves like a
 * physical object: the initials float 70px above its surface and cast a soft
 * shadow on it once they fill in. With a mouse, the card tilts toward the
 * pointer, the shadow shifts against the tilt, the border lights up under the
 * pointer, a soft glare follows it, and a foil of thin accent and ink bands
 * slides across with the tilt. On load the foil sweeps across once. In the
 * stacked layout the card rises into place as it scrolls into view. Reduced
 * motion shows the filled initials at rest, without the sweep or the tilt.
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
  const { t } = useTranslation()
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  /** Shows the photo unless there is none or this URL failed to load. */
  const showImage = Boolean(imageUrl) && failedUrl !== imageUrl
  const prefersReducedMotion = useReducedMotion()
  const rotateX = useSpring(0, tiltSpring)
  const rotateY = useSpring(0, tiltSpring)
  const hover = useSpring(0, hoverSpring)
  const glareX = useMotionValue(0)
  const glareY = useMotionValue(0)
  const pointerX = useMotionValue(50)
  const pointerY = useMotionValue(50)
  const sweep = useMotionValue(-40)

  /** Slides the foil with the sideways tilt and the load sweep. */
  const foilPosition = useTransform(
    [rotateY, sweep],
    ([tiltY, sweepOffset]) =>
      `${50 + (tiltY as number) * 4 + (sweepOffset as number)}% 50%`,
  )
  /** Shows the foil while hovered, and while the load sweep crosses. */
  const foilOpacity = useTransform(
    [hover, sweep],
    ([hoverAmount, sweepOffset]) =>
      Math.max(
        hoverAmount as number,
        1 - Math.min(1, Math.abs(sweepOffset as number) / 40),
      ),
  )
  /** An accent light on the border, centred under the pointer. */
  const edgeLight = useMotionTemplate`radial-gradient(220px circle at ${pointerX}% ${pointerY}%, color-mix(in srgb, var(--cv-accent) 85%, transparent), transparent 70%)`
  /** Moves the initials' shadow against the sideways tilt. */
  const shadowX = useTransform(rotateY, (tiltY) => -tiltY * 1.6)
  /** Moves the initials' shadow against the forward tilt, below them. */
  const shadowY = useTransform(rotateX, (tiltX) => tiltX * 1.6 + 14)

  useEffect(() => {
    if (prefersReducedMotion) {
      return
    }

    sweep.set(-40)
    const controls = animate(sweep, 40, {
      duration: 1.6,
      delay: 0.9,
      ease: [0.45, 0, 0.2, 1],
    })
    return () => controls.stop()
  }, [prefersReducedMotion, sweep])

  /**
   * Tilts the card toward a mouse pointer and moves the glare and the border
   * light under it. Measured on the untransformed wrapper, so the tilt never
   * skews the bounds.
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
    pointerX.set((offsetX / bounds.width) * 100)
    pointerY.set((offsetY / bounds.height) * 100)
    hover.set(1)
  }

  /** Springs the card back to level when the pointer leaves. */
  const resetTilt = (): void => {
    rotateX.set(0)
    rotateY.set(0)
    hover.set(0)
  }

  return (
    <div
      onPointerMove={tilt}
      onPointerLeave={resetTilt}
      className="group w-full perspective-[900px] max-lg:animate-cv-scroll-rise"
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative rounded-3xl shadow-cv-panel will-change-transform"
      >
        <div className="relative overflow-hidden rounded-3xl bg-cv-line p-0.5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[200%] -translate-1/2 bg-cv-sweep animate-cv-sweep motion-reduce:hidden print:hidden"
          />
          <motion.div
            aria-hidden="true"
            style={{ backgroundImage: edgeLight, opacity: hover }}
            className="pointer-events-none absolute inset-0 print:hidden"
          />
          <div
            className={`relative w-full overflow-hidden rounded-[calc(1.5rem-2px)] bg-cv-surface ${showImage ? "h-[clamp(20rem,68dvh,40rem)]" : "h-44 lg:h-[clamp(16rem,46dvh,26rem)]"}`}
          >
            {showImage ? (
              <img
                src={imageUrl ?? undefined}
                alt={
                  fullName
                    ? t("cv.portraitOf", { name: fullName })
                    : t("cv.portrait")
                }
                onError={() => setFailedUrl(imageUrl ?? null)}
                className="size-full object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="grid size-full place-items-center bg-linear-to-br from-cv-accent/20 via-transparent to-transparent"
              >
                <motion.span
                  style={{ x: shadowX, y: shadowY }}
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 0.3 }}
                  transition={fillTransition}
                  className="grid blur-md print:hidden"
                >
                  <svg viewBox="0 0 160 100" className={monogramClassName}>
                    <text
                      x="80"
                      y="50"
                      fontSize="100"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="currentColor"
                    >
                      {initials}
                    </text>
                  </svg>
                </motion.span>
              </div>
            )}
            <motion.div
              aria-hidden="true"
              style={{
                backgroundImage: foilBands,
                backgroundSize: "250% 100%",
                backgroundPosition: foilPosition,
                opacity: foilOpacity,
              }}
              className="pointer-events-none absolute inset-0 print:hidden"
            />
            <motion.div
              aria-hidden="true"
              style={{ x: glareX, y: glareY }}
              className={`pointer-events-none absolute top-0 left-0 -mt-40 -ml-40 size-80 bg-cv-glow opacity-0 transition-opacity duration-300 motion-reduce:hidden ${showImage ? "mix-blend-overlay [--glow:#fff] group-hover:opacity-40" : "group-hover:opacity-25"}`}
            />
          </div>
        </div>
        {!showImage && (
          <div
            aria-hidden="true"
            style={{ transform: "translateZ(70px)" }}
            className="pointer-events-none absolute inset-0 grid place-items-center"
          >
            <svg viewBox="0 0 160 100" className={monogramClassName}>
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
                  fillOpacity: fillTransition,
                }}
              >
                {initials}
              </motion.text>
            </svg>
          </div>
        )}
      </motion.div>
    </div>
  )
}
