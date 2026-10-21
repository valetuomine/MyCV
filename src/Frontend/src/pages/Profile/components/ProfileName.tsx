import {
  m as motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type Variants,
} from "framer-motion"
import { Fragment, useEffect, useMemo, useRef, useState, type JSX } from "react"
import { splitGraphemes } from "../utils/profileFormUtils"

interface ProfileNameProps {
  fullName: string
}

interface Glyph {
  letter: string
  kerning: number
  delay: number
}

/** The heading's weight and family at 100px, so measured widths read as em. */
const kerningFont = '600 100px "Geist Variable"'
const revealDelay = 0.15
const revealSpread = 0.6
const maxLetterStagger = 0.035
const revealDuration = 0.9
const sheenSpring = { stiffness: 100, damping: 20 }

/**
 * Each letter rises from behind its word's clipped bottom edge, after its own
 * delay.
 */
const letterReveal: Variants = {
  hidden: { y: "110%" },
  visible: (delay: number) => ({
    y: "0%",
    transition: { duration: revealDuration, ease: [0.22, 1, 0.36, 1], delay },
  }),
}

/**
 * Groups the letters under the heading, so the page's entrance stagger counts
 * the name as one item rather than one per letter.
 */
const nameGroup: Variants = { hidden: {}, visible: {} }

/** Fades the sheen in after the given delay. */
const sheenReveal: Variants = {
  hidden: { opacity: 0 },
  visible: (delay: number) => ({
    opacity: 1,
    transition: { duration: 0.4, delay },
  }),
}

/**
 * Room for glyph ink outside the tight boxes: accents and descenders above and
 * below the line, and edges that the negative tracking pushes past each
 * letter's advance. Background-clipped text is only painted inside its own
 * box. Negative margins give the room back, so layout stays the same.
 */
const bleed =
  "px-[0.1em] pt-[0.15em] pb-[0.08em] -mx-[0.1em] -mt-[0.15em] -mb-[0.08em]"

/**
 * Builds a letter's end margin, which carries both the bleed and the
 * restored kerning.
 *
 * @param kerning - The letter's kerning against the next one, in em.
 * @returns The inline style with the end margin.
 */
function letterMargin(kerning: number): { marginInlineEnd: string } {
  return { marginInlineEnd: `${kerning - 0.1}em` }
}

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
function measureKerning(words: string[][]): number[][] | null {
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

/**
 * Tells whether the font is ready to render the text, and loads it when it
 * isn't yet.
 *
 * @param font - The CSS font shorthand to check.
 * @param text - The text whose glyphs must be available.
 * @returns True once the font is loaded.
 */
function useFontLoaded(font: string, text: string): boolean {
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

/**
 * The candidate's name, revealed letter by letter. With a mouse, an accent
 * sheen follows the pointer across it on the background spotlight's spring.
 * The sheen repeats the letters' layout, so it lands on each glyph.
 *
 * @param props - The component props.
 * @param props.fullName - The candidate's name.
 * @returns The name heading.
 */
export default function ProfileName({
  fullName,
}: ProfileNameProps): JSX.Element {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const fontLoaded = useFontLoaded(kerningFont, fullName)
  const pointerX = useMotionValue(-1000)
  const pointerY = useMotionValue(-1000)
  const sheenX = useSpring(pointerX, sheenSpring)
  const sheenY = useSpring(pointerY, sheenSpring)
  /** An accent glow centred on the spring-following pointer position. */
  const sheen = useMotionTemplate`radial-gradient(14rem circle at ${sheenX}px ${sheenY}px, color-mix(in srgb, var(--cv-accent) 85%, transparent), transparent)`

  /**
   * Splits the name into words of letters, each with its kerning and reveal
   * delay. The stagger shrinks for long names, so the whole reveal fits in
   * `revealSpread`, and the sheen appears once the last letter has risen.
   */
  const { words, sheenDelay } = useMemo(() => {
    const letters = fullName.split(/\s+/).filter(Boolean).map(splitGraphemes)
    const kerning = fontLoaded ? measureKerning(letters) : null
    const count = letters.flat().length
    const stagger = Math.min(
      maxLetterStagger,
      revealSpread / Math.max(count - 1, 1),
    )
    let index = 0
    const glyphs: Glyph[][] = letters.map((word, wordIndex) =>
      word.map((letter, letterIndex) => ({
        letter,
        kerning: kerning?.[wordIndex][letterIndex] ?? 0,
        delay: revealDelay + index++ * stagger,
      })),
    )
    return {
      words: glyphs,
      sheenDelay:
        revealDelay + Math.max(count - 1, 0) * stagger + revealDuration,
    }
  }, [fullName, fontLoaded])

  useEffect(() => {
    if (prefersReducedMotion) {
      return
    }

    /**
     * Moves the sheen to a mouse pointer, relative to the heading.
     *
     * @param event - The pointer move anywhere on the page.
     */
    const track = (event: PointerEvent): void => {
      const heading = headingRef.current
      if (event.pointerType !== "mouse" || !heading) {
        return
      }

      const bounds = heading.getBoundingClientRect()
      pointerX.set(event.clientX - bounds.left)
      pointerY.set(event.clientY - bounds.top)
    }

    window.addEventListener("pointermove", track, { passive: true })
    return () => window.removeEventListener("pointermove", track)
  }, [prefersReducedMotion, pointerX, pointerY])

  return (
    <motion.h1
      ref={headingRef}
      variants={nameGroup}
      dir="auto"
      className="relative mt-8 font-cv-display text-[clamp(3rem,8.5vw,7rem)] leading-[0.95] font-semibold tracking-tighter text-balance"
    >
      <span className="sr-only">{fullName}</span>
      <span aria-hidden="true" className="block">
        {words.map((word, wordIndex) => (
          <Fragment key={wordIndex}>
            {wordIndex > 0 && " "}
            <span className={`inline-block overflow-clip ${bleed}`}>
              {word.map(({ letter, kerning, delay }, letterIndex) => (
                <motion.span
                  key={letterIndex}
                  custom={delay}
                  variants={letterReveal}
                  style={letterMargin(kerning)}
                  className={`inline-block bg-linear-to-b from-cv-ink to-cv-muted bg-clip-text text-transparent print:bg-none print:text-cv-ink forced-colors:bg-none forced-colors:text-[CanvasText] ${bleed}`}
                >
                  {letter}
                </motion.span>
              ))}
            </span>
          </Fragment>
        ))}
      </span>
      <motion.span
        aria-hidden="true"
        custom={sheenDelay}
        variants={sheenReveal}
        style={{ backgroundImage: sheen }}
        className="pointer-events-none absolute inset-0 block bg-clip-text text-transparent select-none motion-reduce:hidden print:hidden forced-colors:hidden"
      >
        {words.map((word, wordIndex) => (
          <Fragment key={wordIndex}>
            {wordIndex > 0 && " "}
            <span className={`inline-block ${bleed}`}>
              {word.map(({ letter, kerning }, letterIndex) => (
                <span
                  key={letterIndex}
                  style={letterMargin(kerning)}
                  className={`inline-block ${bleed}`}
                >
                  {letter}
                </span>
              ))}
            </span>
          </Fragment>
        ))}
      </motion.span>
    </motion.h1>
  )
}
