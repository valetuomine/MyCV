/**
 * Builds a CSS font shorthand at 100px from a font token, so measured widths
 * read as em. The family is read from the token, so the name is always
 * measured in the font it is set in.
 *
 * @param token - The font token's custom property, such as `--font-cv-name`.
 * @param weight - The weight to measure at.
 * @returns The CSS font shorthand for measuring and loading the font.
 */
export function tokenFont(token: string, weight: number): string {
  const family = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim()
  return `${weight} 100px ${family}`
}

/** Room each letter box keeps past the ink, in em. */
const inkMargin = 0.04

/** The smallest room on each side, which the name's glow and blur need. */
const minBleed = { x: 0.1, top: 0.15, bottom: 0.08 }

/** How far a name's ink reaches past its letter boxes, in em. */
export interface InkBleed {
  x: number
  top: number
  bottom: number
}

/**
 * Measures how far the letters' ink reaches past their boxes, so each letter
 * box can bleed that far and nothing of a swash, a descender or a loop is
 * cut off. Background-clipped text is painted only inside its own box, and a
 * script font's strokes reach well past a letter's advance and line box.
 * The sideways room is the same on both sides, so it holds for right-to-left
 * names too. Each value is at least `minBleed`.
 *
 * @param letters - The name's letters.
 * @param font - The font shorthand at 100px at the heaviest weight shown.
 * @param lineHeight - The heading's line height, in em.
 * @returns The room to give each letter box, in em.
 */
export function measureInkBleed(
  letters: string[],
  font: string,
  lineHeight: number,
): InkBleed {
  const context = document.createElement("canvas").getContext("2d")
  if (!context) {
    return minBleed
  }

  context.font = font
  const line = lineHeight * 100
  let x = 0
  let top = 0
  let bottom = 0
  letters.forEach((letter) => {
    const metrics = context.measureText(letter)
    const ascent = metrics.fontBoundingBoxAscent
    const descent = metrics.fontBoundingBoxDescent
    x = Math.max(
      x,
      metrics.actualBoundingBoxLeft,
      metrics.actualBoundingBoxRight - metrics.width,
    )
    top = Math.max(
      top,
      metrics.actualBoundingBoxAscent - (ascent - descent + line) / 2,
    )
    bottom = Math.max(
      bottom,
      metrics.actualBoundingBoxDescent - (descent - ascent + line) / 2,
    )
  })
  return {
    x: atLeast(minBleed.x, x / 100 + inkMargin),
    top: atLeast(minBleed.top, top / 100 + inkMargin),
    bottom: atLeast(minBleed.bottom, bottom / 100 + inkMargin),
  }
}

/**
 * Picks the larger of a minimum and a measured reach. A browser without the
 * font's bounding box metrics measures NaN, which falls back to the minimum,
 * so the bleed never becomes an invalid length.
 *
 * @param minimum - The smallest reach, in em.
 * @param measured - The measured reach, in em.
 * @returns The measured reach when it is a finite number above the minimum,
 *   otherwise the minimum.
 */
function atLeast(minimum: number, measured: number): number {
  return Number.isFinite(measured) ? Math.max(minimum, measured) : minimum
}

/**
 * Measures each letter's kerning against the next one, in em. One element
 * per letter drops the font's kerning, so each letter gets its pair
 * adjustment back as an end margin. Returns null without a canvas context.
 *
 * The canvas sets a letter spacing because any letter spacing turns
 * ligatures off, as one element per letter does in the heading, and it
 * cancels out of each pair's difference.
 *
 * @param words - The name's words, each split into letters.
 * @param font - The heading's font shorthand at 100px (`tokenFont`).
 * @returns Each letter's kerning in em, 0 for a word's last letter, or null.
 */
export function measureKerning(
  words: string[][],
  font: string,
): number[][] | null {
  const context = document.createElement("canvas").getContext("2d")
  if (!context) {
    return null
  }

  context.font = font
  context.letterSpacing = "-5px"
  /**
   * Measures the rendered width of a text run.
   *
   * @param text - The text to measure.
   * @returns The width in pixels.
   */
  const width = (text: string): number => context.measureText(text).width
  return words.map((letters) =>
    letters.map((letter, index) => {
      if (index === letters.length - 1) {
        return 0
      }

      const next = letters[index + 1]
      return (width(letter + next) - width(letter) - width(next)) / 100
    }),
  )
}
