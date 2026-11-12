import {
  m as motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion"
import {
  useSyncExternalStore,
  type JSX,
  type PointerEvent,
  type ReactNode,
} from "react"
import IdleSignOutWarning from "../../auth/IdleSignOutWarning"
import SessionExpiredMessage from "../../auth/SessionExpiredMessage"
import {
  getSessionRefusal,
  subscribeSessionRefusal,
} from "../../auth/sessionRefusal"
import SignedOutNotice from "../../auth/SignedOutNotice"
import SignOutMessage from "../../auth/SignOutMessage"
import useSigningOutReason from "../../auth/useSigningOutReason"
import DotEcho from "./DotEcho"
import LightEcho from "./LightEcho"
import LightSweep from "./LightSweep"
import PageControls from "./PageControls"

interface BackgroundProps {
  children: ReactNode
}

/** How far the beam's source sits outside the page's corner, in pixels. */
const beamSourceOffset = 128
/** The beam's resting direction from its source, in degrees. */
const beamRestAngle = 32
/** The share of the pointer's angle from the rest that the beam follows. */
const beamLeanShare = 0.35
/** The furthest the beam leans either way, in degrees. */
const maxBeamLean = 9

/**
 * The page frame: a background lit from the top-left corner like the portrait
 * card, with dots and grain, the sign-out, language and theme controls, and
 * the sign-out notice. None of them are printed, and the frame leaves no
 * padding or minimum height on paper. The controls share one row, which wraps
 * only on screens too narrow for it, such as 320 px with the Finnish Sign out.
 * It also signs an idle user out on every page, with a warning for the last
 * minute (`IdleSignOutWarning`), and shows the sign-out screen instead of the
 * page while a sign-out is under way. When the API refuses the session, it
 * shows `SessionExpiredMessage` and keeps the page mounted but hidden on
 * screen, so an edit form keeps its unsaved changes while the user signs in
 * again, and a printout still shows the page. The light falls as a
 * diagonal wash and a beam past the first screen, one band of it rests across
 * the page with no dots under it, and the light theme fades into a faint shade
 * in the far corner. With a mouse, a spotlight follows the pointer on a spring
 * and lights up the dots beneath it, and the beam leans toward the pointer around
 * its source, as the card tilts. While the CV shows, `LightSweep` carries one
 * band of light across the page from the left, `LightEcho` carries another one
 * from the bottom up, and `DotEcho` lights the dots under both and swells the
 * dots under the spotlight. Forced colours leave the light out.
 *
 * @param props - The component props.
 * @param props.children - The page content.
 * @returns The framed page.
 */
export default function Background({ children }: BackgroundProps): JSX.Element {
  const signingOutReason = useSigningOutReason()
  const sessionRefusal = useSyncExternalStore(
    subscribeSessionRefusal,
    getSessionRefusal,
  )

  const pointerX = useMotionValue(-1000)
  const pointerY = useMotionValue(-1000)
  const spotlightX = useSpring(pointerX, { stiffness: 100, damping: 20 })
  const spotlightY = useSpring(pointerY, { stiffness: 100, damping: 20 })

  /**
   * Shifts the lit dots' mask against the spotlight, so the dots stay on the
   * page grid; the second position keeps the mask of the light's falloff still.
   */
  const litDotsPosition = useTransform(
    [spotlightX, spotlightY],
    ([x, y]) => `calc(14rem - ${x}px) calc(14rem - ${y}px), 0 0`,
  )

  const prefersReducedMotion = useReducedMotion()
  const beamLean = useSpring(0, { stiffness: 100, damping: 20 })

  /**
   * Moves the spotlight to a mouse pointer and leans the beam toward it,
   * unless motion is reduced.
   *
   * @param event - The pointer move over the page.
   */
  const trackPointer = (event: PointerEvent<HTMLElement>): void => {
    if (event.pointerType !== "mouse" || prefersReducedMotion) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - bounds.left
    const y = event.clientY - bounds.top
    pointerX.set(x)
    pointerY.set(y)

    /** The pointer's direction from the beam's source, in degrees. */
    const towardPointer =
      (Math.atan2(y + beamSourceOffset, x + beamSourceOffset) * 180) / Math.PI
    beamLean.set(
      Math.max(
        -maxBeamLean,
        Math.min(maxBeamLean, (towardPointer - beamRestAngle) * beamLeanShare),
      ),
    )
  }

  /** Lets the beam settle back when the pointer leaves the page. */
  const releaseBeam = (): void => {
    beamLean.set(0)
  }

  return (
    <div
      onPointerMove={trackPointer}
      onPointerLeave={releaseBeam}
      className="relative isolate min-h-dvh overflow-x-clip bg-cv-background text-cv-ink print:min-h-0 print:bg-transparent"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden print:hidden"
      >
        <div className="absolute inset-0 bg-cv-light-falloff forced-colors:hidden" />
        <div className="absolute inset-x-0 top-0 h-[max(100dvh,48rem)] forced-colors:hidden">
          <div className="absolute top-0 left-0 size-[162.5%] bg-cv-light-wash" />
          <motion.div
            style={{ rotate: beamLean }}
            className="absolute -top-32 right-0 -bottom-[35%] -left-32 origin-top-left bg-cv-light-beam motion-safe:pointer-fine:will-change-transform"
          />
          <div className="absolute top-[20%] left-1/2 h-[70%] w-[calc(105vw+30dvh)] -translate-x-1/2 rotate-15 bg-cv-light-echo [--band-light:var(--cv-light-rest)]" />
          <LightSweep />
          <LightEcho />
        </div>
        <div className="absolute inset-0 bg-cv-dots bg-cv-dots-fade" />
        <motion.div
          className="absolute top-0 left-0 -mt-[34rem] -ml-[34rem] size-[68rem] bg-cv-spotlight will-change-transform"
          style={{ x: spotlightX, y: spotlightY }}
        />
        <motion.div
          className="absolute top-0 left-0 -mt-[14rem] -ml-[14rem] size-[28rem] bg-cv-dots-lit will-change-transform"
          style={{
            x: spotlightX,
            y: spotlightY,
            maskPosition: litDotsPosition,
          }}
        />
        <DotEcho spotlightX={spotlightX} spotlightY={spotlightY} />
        <div className="absolute inset-0 bg-cv-grain opacity-[0.06]" />
      </div>
      <div className="relative z-10 min-h-dvh px-6 sm:px-[clamp(1.5rem,5vw,5.5rem)] print:min-h-0 print:px-0">
        <PageControls />
        {signingOutReason ? (
          <div className="print:hidden">
            <SignOutMessage reason={signingOutReason} />
          </div>
        ) : (
          <>
            {sessionRefusal && (
              <div className="print:hidden">
                <SessionExpiredMessage refusal={sessionRefusal} />
              </div>
            )}
            <div
              className={
                sessionRefusal === null ? "contents" : "hidden print:contents"
              }
            >
              {children}
            </div>
          </>
        )}
      </div>
      <div className="print:hidden">
        <SignedOutNotice />
        <IdleSignOutWarning />
      </div>
    </div>
  )
}
