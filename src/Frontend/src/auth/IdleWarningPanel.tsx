import { m as motion } from "framer-motion"
import { useEffect, useId, useRef, useState, type JSX } from "react"
import { useTranslation } from "react-i18next"
import Button from "../pages/components/Button"
import { ButtonVariant } from "../types"

interface IdleWarningPanelProps {
  secondsLeft: number
  onContinue: () => void
}

/** The whole countdown in seconds, which the bar is measured against. */
const countdownSeconds = 60
/** The seconds left at which screen readers hear the countdown, from the largest. */
const announcedSeconds = [60, 30, 10] as const

/**
 * Formats the seconds left as a clock, such as `0:45`.
 *
 * @param seconds - The seconds left.
 * @returns The minutes and the two-digit seconds.
 */
function formatCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

/**
 * The idle warning: a panel at the bottom of the screen with a countdown,
 * a bar that empties with it, and Continue session. It is an `alertdialog`
 * that doesn't block the page, and moves focus to the button when it opens,
 * so screen readers read its title, text and time left, and Enter or Space
 * continues the session. When it closes with focus still in it, focus goes
 * back where it was. The clock and the bar are hidden from screen readers;
 * a live region says the time left at 60, 30 and 10 seconds instead of
 * every second, starting from the time left when it opened. Reduced motion
 * leaves out the rise and the bar's glide.
 *
 * @param props - The component props.
 * @param props.secondsLeft - The seconds left before the sign-out.
 * @param props.onContinue - Continues the session.
 * @returns The warning panel.
 */
export default function IdleWarningPanel({
  secondsLeft,
  onContinue,
}: Readonly<IdleWarningPanelProps>): JSX.Element {
  const { t } = useTranslation()
  const titleId = useId()
  const descriptionId = useId()
  const timeLeftId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [openingSeconds] = useState(secondsLeft)
  /**
   * The time screen readers hear: the smallest announced step not yet
   * passed, or the time left when the warning opened, if that was less.
   */
  const announcedTime = Math.min(
    openingSeconds,
    [...announcedSeconds].reverse().find((step) => secondsLeft <= step) ??
      countdownSeconds,
  )

  useEffect(() => {
    const previousFocus = document.activeElement
    buttonRef.current?.focus({ preventScroll: true })
    const panel = panelRef.current

    return () => {
      const focus = document.activeElement
      if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected &&
        (focus === null || focus === document.body || panel?.contains(focus))
      ) {
        previousFocus.focus({ preventScroll: true })
      }
    }
  }, [])

  return (
    <motion.div
      ref={panelRef}
      role="alertdialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={`${descriptionId} ${timeLeftId}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto grid max-w-md gap-5 rounded-3xl border border-cv-line bg-cv-surface/90 p-5 shadow-cv-panel backdrop-blur-md sm:p-6 print:hidden"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="grid min-w-0 gap-2">
          <h2
            id={titleId}
            className="m-0 font-cv-display text-xl leading-tight font-semibold tracking-tight text-balance text-cv-ink"
          >
            {t("idleWarning.title")}
          </h2>
          <p
            id={descriptionId}
            className="m-0 text-sm leading-relaxed text-pretty text-cv-copy"
          >
            {t("idleWarning.description")}
          </p>
        </div>
        <span
          aria-hidden="true"
          className="font-cv-mono text-2xl leading-tight font-medium text-cv-ink tabular-nums"
        >
          {formatCountdown(secondsLeft)}
        </span>
      </div>
      <div
        aria-hidden="true"
        className="h-1 overflow-hidden rounded-full bg-cv-overlay"
      >
        <div
          className="h-full origin-left rounded-full bg-cv-accent transition-transform duration-1000 ease-linear motion-reduce:transition-none"
          style={{ transform: `scaleX(${secondsLeft / countdownSeconds})` }}
        />
      </div>
      <p id={timeLeftId} aria-live="polite" className="sr-only">
        {t("idleWarning.timeLeft", { count: announcedTime })}
      </p>
      <Button
        ref={buttonRef}
        variant={ButtonVariant.Primary}
        onClick={onContinue}
        className="justify-self-start"
      >
        {t("idleWarning.continue")}
      </Button>
    </motion.div>
  )
}
