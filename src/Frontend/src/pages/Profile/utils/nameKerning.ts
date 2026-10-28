/** The name heading's weight and family at 100px, so measured widths read as em. */
export const kerningFont = '600 100px "Geist Variable"'

/**
 * Measures each letter's kerning against the next one, in em. One element
 * per letter drops the font's kerning, so each letter gets its pair
 * adjustment back as an end margin. Returns null without a canvas context.
 *
 * The canvas uses the heading's tracking-tighter. Any letter spacing turns
 * ligatures off, as in the heading itself, and it cancels out of each pair's
 * difference.
 *
 * @param words - The name's words, each split into letters.
 * @returns Each letter's kerning in em, 0 for a word's last letter, or null.
 */
export function measureKerning(words: string[][]): number[][] | null {
  const context = document.createElement("canvas").getContext("2d")
  if (!context) {
    return null
  }

  context.font = kerningFont
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
      const next = letters[index + 1]
      return next === undefined
        ? 0
        : (width(letter + next) - width(letter) - width(next)) / 100
    }),
  )
}
