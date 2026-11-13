import {
  cubicBezier,
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
import useNameWeightPlay, { restWeight, weightStep } from "./useNameWeightPlay"

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
const startWeight = 200
const sheenSpring = { stiffness: 100, damping: 20 }

/**
 * How many weight steps the reveal takes. The span from `startWeight` to
 * `restWeight` must divide evenly by `weightStep`, or the last step would
 * overshoot the heading's weight, so a span that doesn't throws when the
 * module loads.
 */
const weightSteps = (restWeight - startWeight) / weightStep
if (!Number.isInteger(weightSteps)) {
  throw new Error("The reveal's weight span must divide evenly by weightStep.")
}

/** The reveal's curve as a function, for easing the weight in steps. */
const revealCurve = cubicBezier(...revealEase)

/**
 * The reveal's curve, snapped so the weight moves in `weightStep` steps, which
 * keeps the weights to a bounded set of cached font instances (see
 * `weightStep` for why).
 *
 * @param progress - The animation's progress, from 0 to 1.
 * @returns The eased progress, snapped to a whole weight step.
 */
function steppedRevealEase(progress: number): number {
  return Math.round(revealCurve(progress) * weightSteps) / weightSteps
}

/**
 * Each letter rises from behind its word's clipped bottom edge, after its own
 * delay, sharpening from a thin blur into the heading's weight on the way.
 * The rise is a `transform` string and the sharpening a `filter`, so the
 * browser runs both, and the fade, off the main thread. Only the weight runs
 * on it, in steps (`steppedRevealEase`).
 */
const letterReveal: Variants = {
  hidden: {
    transform: "translateY(110%)",
    opacity: 0,
    filter: "blur(14px)",
    fontWeight: startWeight,
  },
  visible: (delay: number) => ({
    transform: "translateY(0%)",
    opacity: 1,
    filter: "blur(0px)",
    fontWeight: restWeight,
    transition: {
      duration: revealDuration,
      ease: revealEase,
      delay,
      fontWeight: { inherit: true, ease: steppedRevealEase },
    },
    transitionEnd: { transform: "none", filter: "none" },
  }),
}

/**
 * The reveal for reduced motion: the rise alone, which `MotionConfig` then
 * skips, so the letters show straight away at the heading's weight. It must
 * animate `y`, not a `transform` string as `letterReveal` does: `MotionConfig`
 * skips only positional values such as `y`, so a `transform` string would play
 * the whole rise.
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
 * The bleed for the word part that clips the reveal, with more vertical room
 * than a letter's: the glow's halo spreads 0.12em past the glyphs, and the
 * clip must not cut it off above accents or below descenders. Negative
 * margins give the room back, so layout stays the same.
 */
const clipRoom =
  "px-[0.1em] pt-[0.3em] pb-[0.22em] -mx-[0.1em] -mt-[0.3em] -mb-[0.22em]"

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
 * into its full weight. Afterwards the name plays its weight axis in a
 * wave on touch screens, and sends light across the background when the
 * reveal starts and when it is clicked or tapped (`useNameWeightPlay`). With
 * a mouse, an accent sheen follows the pointer across the name on the
 * background spotlight's spring, and the letters nearest it glow softly. The
 * sheen repeats the letters' layout, weights and widths, so it lands on each
 * glyph. Reduced motion shows the letters at once and turns the weight wave,
 * the glow and the sheen off.
 *
 * @param props - The component props.
 * @param props.fullName - The candidate's name.
 * @returns The name heading.
 */
export default function ProfileName({
  fullName,
}: Readonly<ProfileNameProps>): JSX.Element {
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
    startReveal,
    finishReveal,
  } = useNameWeightPlay(letterCount, words)
  const sheenX = useSpring(pointerX, sheenSpring)
  const sheenY = useSpring(pointerY, sheenSpring)
  /** A soft oval light centred on the spring-following pointer position. */
  const sheen = useMotionTemplate`radial-gradient(11rem 6.5rem at ${sheenX}px ${sheenY}px, var(--cv-name-light), var(--cv-name-light) 30%, transparent)`

  return (
    <motion.h1
      ref={headingRef}
      variants={nameGroup}
      onAnimationStart={startReveal}
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
                className={`inline-block overflow-y-clip ${clipRoom}`}
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
                    className={`inline-block bg-linear-to-b from-cv-ink to-cv-muted bg-clip-text text-transparent print:bg-none print:text-cv-ink print:filter-none! forced-colors:bg-none forced-colors:text-[CanvasText] forced-colors:filter-none! ${bleed}`}
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
                    className={`inline-block ${bleed}`}
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
