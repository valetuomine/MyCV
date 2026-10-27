import { useEffect, useRef, type JSX, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import FieldMessage from "./FieldMessage"
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
  children: ReactNode
}

/** A single sideways shake that settles, for a field left invalid by a submit. */
const shakeKeyframes: Keyframe[] = [
  { transform: "translateX(0)" },
  { transform: "translateX(-4px)" },
  { transform: "translateX(4px)" },
  { transform: "translateX(-3px)" },
  { transform: "translateX(2px)" },
  { transform: "translateX(0)" },
]

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
 * The frame of a form field: its label with a required marker and character
 * count, the field itself, and its validation message beneath it.
 *
 * The frame draws the field's opaque surface, so the page background doesn't
 * show through, and fades the whole field while it is disabled. With a
 * mouse, a light follows the pointer around the field's border and faintly
 * tints the surface beneath the transparent field. The position goes to CSS
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
 * An effect shakes the field once when a submit leaves it invalid, but not
 * when its error changes while typing, and not for reduced motion.
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
  children,
}: FormFieldProps): JSX.Element {
  const { t } = useTranslation()
  const frameRef = useRef<HTMLDivElement>(null)
  const trackPointer = usePointerLight()
  const handledSubmitCountRef = useRef(submitCount)

  /**
   * The count's colour: danger at the limit, accent in its last tenth, and
   * otherwise muted and shown only while the field has focus.
   */
  const countTone =
    maxLength === undefined
      ? undefined
      : length >= maxLength
        ? "text-cv-danger"
        : length >= maxLength * 0.9
          ? "text-cv-accent"
          : "text-cv-muted opacity-0 group-has-[[data-field-frame]:focus-within]/field:opacity-100"

  useEffect(() => {
    if (submitCount === handledSubmitCountRef.current) {
      return
    }

    handledSubmitCountRef.current = submitCount
    if (error && !prefersReducedMotion()) {
      frameRef.current?.animate(shakeKeyframes, { duration: 300 })
    }
  }, [submitCount, error])

  return (
    <div
      data-invalid={error ? true : undefined}
      className="group/field grid min-w-0 content-start gap-2"
    >
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="font-cv-mono text-xs tracking-wide text-cv-muted uppercase transition-colors duration-200 group-has-[[data-field-frame]:focus-within]/field:text-cv-accent"
        >
          {label}
          {required && (
            <span aria-hidden="true" className="text-cv-accent">
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
          ref={frameRef}
          data-field-frame
          onPointerEnter={trackPointer}
          onPointerMove={trackPointer}
          className="group/frame relative isolate min-w-0 flex-1 rounded-lg bg-cv-surface group-data-invalid/field:[--spot:var(--cv-danger)] has-disabled:opacity-60"
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
        {action}
      </div>
      <FieldMessage id={errorId} error={error} />
      {description ? (
        <div id={descriptionId} className="min-w-0 text-sm text-cv-muted">
          {description}
        </div>
      ) : null}
    </div>
  )
}
