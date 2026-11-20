/**
 * The shared look of secondary headings (`h2`) in the app's views: the
 * Fraunces display serif at 1.25rem, weight 600, tight tracking and balanced
 * lines in Ink. The name on the featured CV card is set in the name's
 * script, and the printed CV keeps its own section headings, so neither uses
 * this.
 * A long word breaks rather than widening a narrow column, and `min-w-0`
 * lets it do so inside a grid or flex track. Spacing and layout classes are
 * added where the heading is used.
 */
export const headingClassName =
  "m-0 min-w-0 font-cv-display text-xl leading-tight font-semibold tracking-tight text-balance wrap-break-word text-cv-ink"
