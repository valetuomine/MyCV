import { useEffect, useState } from "react"

/**
 * Tells whether the font is ready to render the text, and loads it when it
 * isn't yet. Readiness is derived for the current font and text on every
 * render, so a new font or text is checked again instead of reusing an
 * earlier answer.
 *
 * @param font - The CSS font shorthand to check.
 * @param text - The text whose glyphs must be available.
 * @returns True once the font is loaded for the text.
 */
export default function useFontLoaded(font: string, text: string): boolean {
  /** The font and text that a finished load was for. */
  const key = `${font}\n${text}`
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  /** Whether a load for this font and text finished, or the font is ready. */
  const loaded = loadedKey === key || document.fonts.check(font, text)

  useEffect(() => {
    if (loaded) {
      return
    }

    let active = true
    void document.fonts.load(font, text).then(() => {
      if (active) {
        setLoadedKey(key)
      }
    })
    return () => {
      active = false
    }
  }, [font, text, key, loaded])

  return loaded
}
