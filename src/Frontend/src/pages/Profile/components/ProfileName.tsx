import {
  m as motion,
  useMotionTemplate,
  useReducedMotion,
  useSpring,
  type Variants,
} from "framer-motion"
import { Fragment, useMemo, type JSX } from "react"
import useFontLoaded from "../../components/useFontLoaded"
import { kerningFont, measureKerning } from "../utils/nameKerning"
import { splitGraphemes } from "../utils/profileFormUtils"
import useNameWeightPlay, { restWeight } from "./useNameWeightPlay"

interface ProfileNameProps {
  fullName: string
}

interface Glyph {
  letter: string
  kerning: number
  delay: number
  index: number
}

const revealDelay = 0.15
const revealSpread = 0.6
const maxLetterStagger = 0.035
const revealDuration = 0.9
const revealEase = [0.22, 1, 0.36, 1] as const
const sheenSpring = { stiffness: 100, damping: 20 }

/**
 * Each letter rises from behind its word's clipped bottom edge, after its own
 * delay, sharpening from a thin blur into the heading's weight on the way.
 */
const letterReveal: Variants = {
  hidden: { y: "110%", opacity: 0, filter: "blur(14px)", fontWeight: 200 },
  visible: (delay: number) => ({
    y: "0%",
    opacity: 1,
    filter: "blur(0px)",
    fontWeight: restWeight,
    transition: { duration: revealDuration, ease: revealEase, delay },
    transitionEnd: { filter: "none" },
  }),
}

/**
 * The reveal for reduced motion: the rise alone, which `MotionConfig` then
 * skips, so the letters show straight away at the heading's weight.
 */
const letterRise: Variants = {
  hidden: { y: "110%" },
  visible: (delay: number) => ({
    y: "0%",
    transition: { duration: revealDuration, ease: revealEase, delay },
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
 * Splits a word after each hyphen, so a double-barrelled name can wrap there.
 * Each part stays one inline block, which wraps between its own letters only
 * when it is wider than the whole line.
 *
 * @param word - The word's letters.
 * @returns The word's parts, in order.
 */
function splitAtHyphens(word: Glyph[]): Glyph[][] {
  const parts: Glyph[][] = [[]]
  word.forEach((glyph, index) => {
    parts[parts.length - 1].push(glyph)
    if (glyph.letter === "-" && index < word.length - 1) {
      parts.push([])
    }
  })
  return parts
}

/**
 * The candidate's name, revealed letter by letter: each letter rises from
 * behind its word's clipped bottom edge while it sharpens from a thin blur
 * into its full weight. Afterwards the name plays its weight axis under a
 * mouse pointer or in a wave on touch screens (`useNameWeightPlay`). With a
 * mouse, an accent sheen also follows the pointer across the name on the
 * background spotlight's spring. The sheen repeats the letters' layout,
 * weights and widths, so it lands on each glyph. Reduced motion shows the
 * letters at once and turns the weight play and the sheen off.
 *
 * @param props - The component props.
 * @param props.fullName - The candidate's name.
 * @returns The name heading.
 */
export default function ProfileName({
  fullName,
}: ProfileNameProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion()
  const fontLoaded = useFontLoaded(kerningFont, fullName)

  /**
   * Splits the name into words of letters, each with its kerning, reveal
   * delay and place in the whole name. The stagger shrinks for long names, so
   * the whole reveal fits in `revealSpread`, and the sheen appears once the
   * last letter has risen.
   */
  const { words, letterCount, sheenDelay } = useMemo(() => {
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
        delay: revealDelay + index * stagger,
        index: index++,
      })),
    )
    return {
      words: glyphs.map(splitAtHyphens),
      letterCount: count,
      sheenDelay:
        revealDelay + Math.max(count - 1, 0) * stagger + revealDuration,
    }
  }, [fullName, fontLoaded])

  const {
    headingRef,
    lettersRef,
    registerLetter,
    registerSheen,
    pointerX,
    pointerY,
    finishReveal,
  } = useNameWeightPlay(letterCount, words)
  const sheenX = useSpring(pointerX, sheenSpring)
  const sheenY = useSpring(pointerY, sheenSpring)
  /** An accent glow centred on the spring-following pointer position. */
  const sheen = useMotionTemplate`radial-gradient(14rem circle at ${sheenX}px ${sheenY}px, color-mix(in srgb, var(--cv-accent) 85%, transparent), transparent)`

  return (
    <motion.h1
      ref={headingRef}
      variants={nameGroup}
      onAnimationComplete={finishReveal}
      dir="auto"
      className="relative mt-8 font-cv-display text-[clamp(3rem,8.5vw,7rem)] leading-[0.95] font-semibold tracking-tighter text-balance"
    >
      <span className="sr-only">{fullName}</span>
      <span ref={lettersRef} aria-hidden="true" className="block">
        {words.map((parts, wordIndex) => (
          <Fragment key={wordIndex}>
            {wordIndex > 0 && " "}
            {parts.map((part, partIndex) => (
              <span
                key={partIndex}
                className={`inline-block overflow-y-clip ${bleed}`}
              >
                {part.map(({ letter, kerning, delay, index }) => (
                  <motion.span
                    key={index}
                    ref={(element: HTMLElement | null) =>
                      registerLetter(index, element)
                    }
                    data-letter=""
                    custom={delay}
                    variants={prefersReducedMotion ? letterRise : letterReveal}
                    style={letterMargin(kerning)}
                    className={`inline-block bg-linear-to-b from-cv-ink to-cv-muted bg-clip-text text-transparent print:bg-none print:text-cv-ink forced-colors:bg-none forced-colors:text-[CanvasText] ${bleed}`}
                  >
                    {letter}
                  </motion.span>
                ))}
              </span>
            ))}
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
        {words.map((parts, wordIndex) => (
          <Fragment key={wordIndex}>
            {wordIndex > 0 && " "}
            {parts.map((part, partIndex) => (
              <span key={partIndex} className={`inline-block ${bleed}`}>
                {part.map(({ letter, kerning, index }) => (
                  <span
                    key={index}
                    ref={(element) => registerSheen(index, element)}
                    style={letterMargin(kerning)}
                    className={`relative inline-block ${bleed}`}
                  >
                    {letter}
                  </span>
                ))}
              </span>
            ))}
          </Fragment>
        ))}
      </motion.span>
    </motion.h1>
  )
}
