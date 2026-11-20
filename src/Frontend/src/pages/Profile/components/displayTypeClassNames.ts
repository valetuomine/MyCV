/**
 * The CV name's size, bound to its container (`@container`) rather than the
 * window: the container's width divided by the name's own width on one line
 * (`--name-width`, in em, which `ProfileName` measures once the font is
 * ready), between 2.5rem and 6rem. The script reads best on one line, like a
 * signature, so every name fits on one line for as long as that size stays
 * at or above the minimum; only a name too long for that wraps. A short name
 * stops at 18% of its container, so it never towers over a narrow column.
 * Until the name is measured, and in the skeleton, the width of a usual
 * two-part name of about 17 letters (6.5em) holds. The name and its skeleton
 * share it.
 */
export const cvNameSizeClassName =
  "text-[length:clamp(2.5rem,calc(100cqi/var(--name-width,6.5)),min(6rem,18cqi))]"

/**
 * The featured card's name size and leading, in the CV name's script, bound
 * to the card's text area beside the portrait (`featuredCvTextClassName`)
 * like the CV's name: the area's width divided by the name's width on one
 * line (`--name-width`, from `useNameLineWidth`), between 1.625rem and 3rem,
 * and at most 18% of the area for a short name. So every name stays on one
 * line for as long as that size stays at or above 1.625rem, which keeps a
 * usual two-part name on one line on a 375px phone, and only a longer one
 * wraps. Until the name is measured, and in the skeleton, a usual
 * two-part name's 6.5em holds. The card and its skeleton share it.
 */
export const featuredCvNameSizeClassName =
  "text-[length:clamp(1.625rem,calc(100cqi/var(--name-width,6.5)),min(3rem,18cqi))] leading-[1.1]"

/**
 * The home page's heading: no margin, and a size that follows the text
 * column, which is the heading's container, not the window, so the featured
 * card beside it never pushes it onto a fourth line. 11% of the column,
 * between 2.75rem and 4.5rem, reaches 4.5rem in a column of about 41rem,
 * which a hero without the card has from `lg` up.
 */
export const homeHeadingClassName =
  "m-0 text-[length:clamp(2.75rem,11cqi,4.5rem)] leading-[1.02] text-balance"
