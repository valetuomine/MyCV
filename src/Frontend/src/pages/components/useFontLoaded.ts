import { useEffect, useState } from "react"

/**
 * Tells whether the font is ready to render the text, and loads it when it
 * isn't yet.
 *
 * @param font - The CSS font shorthand to check.
 * @param text - The text whose glyphs must be available.
 * @returns True once the font is loaded.
 */
export default function useFontLoaded(font: string, text: string): boolean {
  const [loaded, setLoaded] = useState(() => document.fonts.check(font, text))

  useEffect(() => {
    if (loaded) {
      return
    }

    let active = true
    void document.fonts.load(font, text).then(() => {
      if (active) {
        setLoaded(true)
      }
    })
    return () => {
      active = false
    }
  }, [font, text, loaded])

  return loaded
}
