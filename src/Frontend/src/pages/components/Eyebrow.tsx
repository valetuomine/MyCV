import { m as motion, type Variants } from "framer-motion"
import type { JSX, ReactNode } from "react"
import { Tone } from "../../types"

interface EyebrowProps {
  children: ReactNode
  meta?: ReactNode
  tone?: Tone
  pulse?: boolean
  variants?: Variants
  className?: string
}

const rowClassName =
  "m-0 flex flex-wrap items-center gap-x-3 gap-y-1 font-cv-mono text-xs leading-4 font-medium tracking-[0.08em] text-cv-ink uppercase"

/**
 * The small line above a page's or section's heading: a status dot, a mono
 * label in capitals and an optional meta text, such as the CV's update date.
 * The label has the Label style (`labelClassName`) but in Ink rather than
 * Muted, so it reads crisply on the background's light. The meta text is
 * Geist sans with tabular figures in Muted, which stays at 4.5:1 on the
 * light, set apart by a thin rule that wraps with it. The row has an explicit
 * 1rem line height (`leading-4`), which the skeletons reserve. The dot is red
 * for an error tone and the accent otherwise; its pulse is hidden for reduced
 * motion and in print. With `variants`, the line is a `motion.p` that takes part in the
 * parent's staggered reveal.
 *
 * @param props - The component props.
 * @param props.children - The label.
 * @param props.meta - Text after the label, such as a date.
 * @param props.tone - Error turns the dot red; any other tone keeps the accent.
 * @param props.pulse - Whether the dot pulses, for a live or pending state.
 * @param props.variants - Motion variants, for a line inside a staggered reveal.
 * @param props.className - Extra classes, such as spacing.
 * @returns The eyebrow line.
 */
export default function Eyebrow({
  children,
  meta,
  tone = Tone.Neutral,
  pulse = false,
  variants,
  className = "",
}: Readonly<EyebrowProps>): JSX.Element {
  /** Red for errors, accent otherwise. */
  const dotColor = tone === Tone.Error ? "bg-cv-danger" : "bg-cv-accent"
  const content = (
    <>
      <span aria-hidden="true" className="relative grid size-2 shrink-0">
        {pulse && (
          <span
            className={`absolute inset-0 animate-cv-pulse rounded-full ${dotColor} motion-reduce:hidden print:hidden`}
          />
        )}
        <span className={`relative size-2 rounded-full ${dotColor}`} />
      </span>
      <span>{children}</span>
      {meta && (
        <span className="inline-flex items-center gap-3 whitespace-nowrap">
          <span aria-hidden="true" className="h-3 w-px bg-cv-muted/40" />
          <span className="font-cv-sans text-[0.8125rem] leading-4 font-normal tracking-normal text-cv-muted normal-case tabular-nums">
            {meta}
          </span>
        </span>
      )}
    </>
  )
  const classes = `${rowClassName} ${className}`

  return variants ? (
    <motion.p variants={variants} className={classes}>
      {content}
    </motion.p>
  ) : (
    <p className={classes}>{content}</p>
  )
}
