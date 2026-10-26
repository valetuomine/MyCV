import {
  useEffect,
  useRef,
  type JSX,
  type PointerEvent,
  type ReactNode,
} from "react"
import { useTranslation } from "react-i18next"
import FieldMessage from "./FieldMessage"

/** A field's state that the frame shows, as `useFormField` returns it. */
export interface FieldFrameProps {
  id: string
  error?: string
  errorId: string
  maxLength?: number
  length: number
  countId: string
  submitCount: number
}

interface FormFieldProps extends FieldFrameProps {
  label: string
  required?: boolean
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
 * Reads the reduced-motion preference when it is needed, so that a change
 * made while the page is open applies at once.
 *
 * @returns Whether the user prefers reduced motion.
 */
function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * The frame of a form field: its label with a required marker and character
 * count, the field itself, and its validation message beneath it.
 *
 * With a mouse, a light follows the pointer around the field's border and
 * faintly tints its fill. The position goes to CSS variables once per frame,
 * so moving the pointer doesn't re-render. Touch and reduced motion get no
 * light. While the field has focus the label turns accent and a light
 * travels around its border, paused on every other field. An invalid field
 * and reduced motion get no travelling light.
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
 * @param props.submitCount - How many times the form has been submitted.
 * @param props.children - The field.
 * @returns The labelled field with its count and message.
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
  submitCount,
  children,
}: FormFieldProps): JSX.Element {
  const { t } = useTranslation()
  const frameRef = useRef<HTMLDivElement>(null)
  const pointerFrameRef = useRef(0)
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
          : "text-cv-muted opacity-0 group-focus-within/field:opacity-100"

  useEffect(() => {
    if (submitCount === handledSubmitCountRef.current) {
      return
    }

    handledSubmitCountRef.current = submitCount
    if (error && !prefersReducedMotion()) {
      frameRef.current?.animate(shakeKeyframes, { duration: 300 })
    }
  }, [submitCount, error])

  useEffect(() => () => cancelAnimationFrame(pointerFrameRef.current), [])

  /**
   * Moves the border light to a mouse pointer on the next frame, unless
   * motion is reduced.
   *
   * @param event - The pointer entering or moving over the field.
   */
  const trackPointer = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType !== "mouse" || prefersReducedMotion()) {
      return
    }

    const frame = event.currentTarget
    const { clientX, clientY } = event
    cancelAnimationFrame(pointerFrameRef.current)
    pointerFrameRef.current = requestAnimationFrame(() => {
      const bounds = frame.getBoundingClientRect()
      frame.style.setProperty("--x", `${clientX - bounds.left}px`)
      frame.style.setProperty("--y", `${clientY - bounds.top}px`)
    })
  }

  return (
    <div
      data-invalid={error ? true : undefined}
      className="group/field grid min-w-0 content-start gap-2"
    >
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="font-cv-mono text-xs tracking-wide text-cv-muted uppercase transition-colors duration-200 group-focus-within/field:text-cv-accent"
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
      <div
        ref={frameRef}
        onPointerEnter={trackPointer}
        onPointerMove={trackPointer}
        className="group/frame relative isolate group-data-invalid/field:[--spot:var(--cv-danger)]"
      >
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
      <FieldMessage id={errorId} error={error} />
    </div>
  )
}
