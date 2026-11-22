import type { Transition, Variants } from "framer-motion"

/** The spring every part of a staggered entrance rises on. */
const revealSpring: Transition = {
  type: "spring",
  stiffness: 100,
  damping: 20,
}

/**
 * Staggers a page's or a form's parts in one after another. Put it on the
 * motion element that starts the entrance (`initial="hidden"` and
 * `animate="visible"`), or on a part whose own parts should stagger in
 * their turn.
 */
export const revealStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

/**
 * Lets a part without a blurred Pane rise into place and fade in. A part
 * that is a Pane itself can take it too, because a Pane's own opacity keeps
 * its blur.
 */
export const revealItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: revealSpring },
}

/**
 * Lets a part that holds a blurred Pane rise into place and fade in without
 * fading the part itself, because a fading ancestor would switch off the
 * Pane's blur until the fade ends, so the dot grid would show through and
 * then snap away. It animates `--cv-reveal` instead, and only the pieces
 * marked with `opacity-reveal` (the Panes and the pieces without one) fade
 * with it. `FormField`, `FormLanguageSwitch` and `LitCard` mark their own
 * pieces.
 */
export const paneReveal: Variants = {
  hidden: { y: 18, "--cv-reveal": 0 },
  visible: { y: 0, "--cv-reveal": 1, transition: revealSpring },
}
