import { useMemo, type CSSProperties } from "react"
import useFontLoaded from "../../components/useFontLoaded"
import { measureTextWidth, tokenFont } from "../utils/nameKerning"

/**
 * Measures how wide a name is on one line in the CV name's script, once the
 * font is ready, as the `--name-width` property that a name size bound to
 * its container divides by, such as the featured card's
 * (`featuredCvNameSizeClassName`). The name is measured as one run of plain
 * text, the way the card sets it. Until the font is ready the size's own
 * fallback holds.
 *
 * @param fullName - The name to measure.
 * @returns The inline style with `--name-width`, or undefined until the
 *   font is ready or without a canvas.
 */
export default function useNameLineWidth(
  fullName: string,
): CSSProperties | undefined {
  /** The name script's shorthand, read once from its token. */
  const font = useMemo(() => tokenFont("--font-cv-name", 400), [])
  /** The name with its spaces collapsed, as the page renders it. */
  const text = fullName.trim().replaceAll(/\s+/g, " ")
  const fontLoaded = useFontLoaded(font, text)

  return useMemo(() => {
    const width = fontLoaded ? measureTextWidth(text, font) : null
    return width ? ({ "--name-width": width } as CSSProperties) : undefined
  }, [text, font, fontLoaded])
}
