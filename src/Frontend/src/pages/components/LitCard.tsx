import type { JSX, ReactNode } from "react"
import usePointerLight from "./usePointerLight"

interface LitCardProps {
  children: ReactNode
  as?: "div" | "article"
  labelledBy?: string
  className?: string
  contentClassName?: string
  wakesWithEditForm?: boolean
}

/**
 * A card whose surface lights up like the form's fields. A light circles its
 * border. With a mouse, a light follows the pointer around the border and
 * faintly tints the surface beneath the content, and while the card is
 * hovered a soft light drifts slowly from side to side inside it, pausing
 * where it is otherwise. Touch gets no pointer light, and reduced motion none
 * of the lights. The edit view's preview and the home page's featured CV
 * share it, so the two cards stay alike.
 *
 * @param props - The component props.
 * @param props.children - The card's content.
 * @param props.as - The card's element: `article` for a card that stands on
 *   its own, `div` otherwise.
 * @param props.labelledBy - The id of the element that names the card.
 * @param props.className - Classes for the card's outer frame, such as its
 *   margin.
 * @param props.contentClassName - Classes for the content area, such as its
 *   padding and layout.
 * @param props.wakesWithEditForm - Whether the drifting light also runs
 *   while any field of the edit form (the `group/edit` around the card) has
 *   focus, so the card wakes while the profile is edited.
 * @returns The lit card.
 */
export default function LitCard({
  children,
  as: Element = "div",
  labelledBy,
  className = "",
  contentClassName = "",
  wakesWithEditForm = false,
}: Readonly<LitCardProps>): JSX.Element {
  const trackPointer = usePointerLight()

  return (
    <Element
      aria-labelledby={labelledBy}
      onPointerEnter={trackPointer}
      onPointerMove={trackPointer}
      className={`group/lit relative overflow-hidden rounded-3xl bg-cv-field-border p-0.5 shadow-cv-panel ${className}`}
    >
      <div className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[200%] -translate-1/2 bg-cv-sweep animate-cv-sweep motion-reduce:hidden" />
      <div className="pointer-events-none absolute inset-0 bg-cv-field-edge opacity-0 transition-opacity duration-200 group-hover/lit:opacity-100 motion-reduce:hidden" />
      <div
        className={`relative isolate rounded-[calc(1.5rem-2px)] bg-cv-field-surface ${contentClassName}`}
      >
        <div
          className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/lit:opacity-100 motion-reduce:hidden ${wakesWithEditForm ? "group-has-[[data-field-frame]:focus-within]/edit:opacity-100" : ""}`}
        >
          <div
            className={`absolute inset-y-0 left-0 w-1/2 bg-cv-field-drift animate-cv-drift [--drift-strength:16%] [animation-play-state:paused] group-hover/lit:[animation-play-state:running] ${wakesWithEditForm ? "group-has-[[data-field-frame]:focus-within]/edit:[animation-play-state:running]" : ""}`}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-cv-field-glow opacity-0 transition-opacity duration-200 group-hover/lit:opacity-100 motion-reduce:hidden" />
        {children}
      </div>
    </Element>
  )
}
