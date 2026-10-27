/**
 * Reads the reduced-motion preference when it is needed, so that a change
 * made while the page is open applies at once.
 *
 * @returns Whether the user prefers reduced motion.
 */
export default function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}
