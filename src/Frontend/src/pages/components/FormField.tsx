import { useState, type AnimationEvent, type JSX, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import FieldMessage from "./FieldMessage"
import { labelClassName } from "./labelClassName"
import prefersReducedMotion from "./prefersReducedMotion"
import usePointerLight from "./usePointerLight"

/** A field's state that the frame shows, as `useFormField` returns it. */
export interface FieldFrameProps {
  id: string
  error?: string
  errorId: string
  maxLength?: number
  length: number
  countId: string
  descriptionId: string
  submitCount: number
}

interface FormFieldProps extends FieldFrameProps {
  label: string
  required?: boolean
  description?: ReactNode
  action?: ReactNode
  shakeOnMount?: boolean
  children: ReactNode
}

/**
 * One lap of the focus light, in seconds. Set on each glow, so it also sets
 * how far apart the glows' delays place them.
 */
const traceLapSeconds = 8

/** The length of the focus light's comet, in percent of the field's border. */
const traceLength = 20

/** How many soft glows make up the comet. */
const traceGlowCount = 10

/** The opacity of the glow at the comet's head. */
const traceGlowPeak = 0.6

/**
 * The comet's glows from tail to head, as fractions of its length. Each fades
 * out from its centre and they overlap, so the comet brightens smoothly
 * toward its head and bends around the corners.
 */
const traceGlows = Array.from(
  { length: traceGlowCount },
  (_, index) => (index + 1) / traceGlowCount,
)

/**
 * Picks the character count's colour: danger at the limit, accent in its
 * last tenth, and otherwise muted and shown only while the field has focus.
 *
 * @param length - The value's length.
 * @param maxLength - The field's limit.
 * @returns The count's classes.
 */
function pickCountTone(length: number, maxLength: number): string {
  if (length >= maxLength) {
    return "text-cv-danger"
  }

  return length >= maxLength * 0.9
    ? "text-cv-accent-strong"
    : "text-cv-muted opacity-0 group-has-[[data-field-frame]:focus-within]/field:opacity-100"
}

/**
 * The frame of a form field: its label with a required marker and character
 * count, the field itself, and its validation message beneath it.
 *
 * The frame draws the field's surface, the see-through and blurred Pane, so
 * the page's light shows through softly and its dot grid blurs away, with
 * the resting edge glow around it, which a mouse hover strengthens and any
 * focus inside strengthens most (neither in print, and no hover glow on a
 * disabled field). An invalid field gets the neutral Pane and a
 * danger-coloured glow.
 * The frame also fades the whole field while it is disabled. The label
 * row, the frame, the action and the description each fade with a
 * pane-safe entrance (`paneReveal`), so a field fades in without switching
 * off the frame's blur. With a mouse, a light follows the pointer around
 * the field's border and faintly tints the surface beneath the transparent
 * field. The position goes to CSS
 * variables once per frame, so moving the pointer doesn't re-render. Touch
 * and reduced motion get no light. While the field has focus the label turns
 * accent and a light travels around its border, paused on every other field.
 * An invalid field and reduced motion get no travelling light. While the
 * field is hovered or has focus, a soft light also drifts slowly from side
 * to side inside it, on its own timing, and pauses where it is otherwise.
 * Reduced motion and a disabled field get no drifting light.
 *
 * The count shows while the field has focus, and always from 90% of the
 * limit, in accent and then in danger at the limit. Screen readers hear it
 * as part of the field's description, not on every keystroke.
 *
 * The field shakes once (`animate-cv-shake`) when a submit leaves it
 * invalid, but not when its error changes while typing, and not for reduced
 * motion. A new `submitCount` starts the shake during render, without an
 * effect, and the shake's end clears it. A field that a failed submit
 * mounts, such as one in a language the submit switched to, never sees its
 * `submitCount` change, so `shakeOnMount` shakes it when it mounts invalid.
 *
 * @param props - The component props.
 * @param props.id - The field element's ID, which the label points to.
 * @param props.label - The field's label.
 * @param props.required - Whether the field is required, marked with `*`.
 * @param props.error - The validation message, if any.
 * @param props.errorId - The message's ID, for the field's `aria-describedby`.
 * @param props.maxLength - The character limit, which shows the count.
 * @param props.length - The number of characters in the field.
 * @param props.countId - The count's ID, for the field's `aria-describedby`.
 * @param props.descriptionId - The description's ID, for the field's
 * `aria-describedby`.
 * @param props.submitCount - How many times the form has been submitted.
 * @param props.description - A hint shown below the field and its message,
 * when it is truthy.
 * @param props.action - A control beside the field, such as its form's
 * submit button. It shares the field's row, so it stays level with the field
 * and as tall as it whatever the label does, and focusing it doesn't light
 * the label or the count.
 * @param props.shakeOnMount - Whether a failed submit mounted the field, so
 * it shakes when it mounts with an error.
 * @param props.children - The field.
 * @returns The labelled field with its count, message and description.
 */
export default function FormField({
  id,
  label,
  required,
  error,
  errorId,
  maxLength,
  length,
  countId,
  descriptionId,
  submitCount,
  description,
  action,
  shakeOnMount = false,
  children,
}: Readonly<FormFieldProps>): JSX.Element {
  const { t } = useTranslation()
  const trackPointer = usePointerLight()
  const [handledSubmitCount, setHandledSubmitCount] = useState(submitCount)
  const [isShaking, setIsShaking] = useState(
    () => shakeOnMount && Boolean(error) && !prefersReducedMotion(),
  )

  if (submitCount !== handledSubmitCount) {
    setHandledSubmitCount(submitCount)
    if (error && !prefersReducedMotion()) {
      setIsShaking(true)
    }
  }

  /** The count's colour, or none for a field without a limit. */
  const countTone =
    maxLength === undefined ? undefined : pickCountTone(length, maxLength)

  /**
   * Ends the shake when the frame's own animation ends or is cancelled, not
   * when one of the lights inside it finishes a round, so a cancelled shake
   * never leaves `animate-cv-shake` on.
   *
   * @param event - The animation end or cancel event.
   */
  const stopShaking = (event: AnimationEvent<HTMLDivElement> | Event): void => {
    if (event.target === event.currentTarget) {
      setIsShaking(false)
    }
  }

  /**
   * Listens for a cancelled shake on the frame, because React has no
   * `onAnimationCancel` prop.
   *
   * @param frame - The field's frame.
   * @returns Removes the listener when React detaches this ref.
   */
  const listenForCancelledShake = (frame: HTMLDivElement): (() => void) => {
    frame.addEventListener("animationcancel", stopShaking)
    return () => {
      frame.removeEventListener("animationcancel", stopShaking)
    }
  }

  return (
    <div
      data-invalid={error ? true : undefined}
      className="group/field grid min-w-0 content-start gap-2"
    >
      <div className="flex items-baseline justify-between gap-3 opacity-reveal">
        <label
          htmlFor={id}
          className={`${labelClassName} transition-colors duration-200 group-has-[[data-field-frame]:focus-within]/field:text-cv-accent-strong`}
        >
          {label}
          {required && (
            <span aria-hidden="true" className="text-cv-accent-strong">
              {" "}
              *
            </span>
          )}
        </label>
        {maxLength !== undefined && (
          <span
            id={countId}
            className={`shrink-0 font-cv-mono text-xs tabular-nums transition-[color,opacity] duration-200 ${countTone}`}
          >
            {length} / {maxLength}
            <span className="sr-only">{t("common.characters")}</span>
          </span>
        )}
      </div>
      <div className="flex min-w-0 gap-3">
        <div
          data-field-frame
          onAnimationEnd={stopShaking}
          ref={listenForCancelledShake}
          onPointerEnter={trackPointer}
          onPointerMove={trackPointer}
          className={`group/frame relative isolate min-w-0 flex-1 rounded-lg bg-cv-pane ${isShaking ? "animate-cv-shake" : ""} shadow-cv-edge transition-[background-color,box-shadow] duration-200 ease-out not-print:hover:not-has-disabled:not-has-focus-visible:shadow-cv-edge-hover not-print:has-focus-visible:shadow-cv-edge-focus group-data-invalid/field:bg-cv-pane-neutral group-data-invalid/field:bg-none group-data-invalid/field:[--cv-autofill:var(--cv-surface)] group-data-invalid/field:[--edge:var(--cv-danger)] motion-reduce:transition-none forced-colors:shadow-none print:shadow-none group-data-invalid/field:[--spot:var(--cv-danger)] opacity-reveal has-disabled:opacity-[calc(var(--cv-reveal)*0.6)]`}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-lg opacity-0 transition-opacity duration-300 group-focus-within/frame:opacity-100 group-hover/frame:opacity-100 group-has-disabled/frame:hidden motion-reduce:hidden"
          >
            <span className="absolute inset-y-0 left-0 w-1/2 bg-cv-field-drift animate-cv-drift [animation-play-state:paused] group-focus-within/frame:[animation-play-state:running] group-hover/frame:[animation-play-state:running]" />
          </span>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 rounded-lg bg-cv-field-glow opacity-0 transition-opacity duration-200 group-hover/frame:opacity-100 group-has-disabled/frame:hidden motion-reduce:hidden"
          />
          {children}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-lg bg-cv-field-edge mask-cv-field-border opacity-0 transition-opacity duration-200 group-hover/frame:opacity-100 group-has-disabled/frame:hidden motion-reduce:hidden"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg mask-cv-field-border opacity-0 transition-opacity duration-200 group-focus-within/frame:opacity-100 group-data-invalid/field:hidden motion-reduce:hidden"
          >
            {traceGlows.map((lead) => (
              <span
                key={lead}
                style={{
                  opacity: lead * traceGlowPeak,
                  animationDuration: `${traceLapSeconds}s`,
                  animationDelay: `${(-lead * traceLength * traceLapSeconds) / 100}s`,
                }}
                className="absolute top-0 left-0 size-24 bg-cv-glow offset-cv-field-border animate-cv-trace [animation-play-state:paused] group-focus-within/frame:[animation-play-state:running]"
              />
            ))}
          </span>
        </div>
        {action && <div className="flex shrink-0 opacity-reveal">{action}</div>}
      </div>
      <FieldMessage id={errorId} error={error} />
      {description ? (
        <div
          id={descriptionId}
          className="min-w-0 text-sm text-cv-muted opacity-reveal"
        >
          {description}
        </div>
      ) : null}
    </div>
  )
}
