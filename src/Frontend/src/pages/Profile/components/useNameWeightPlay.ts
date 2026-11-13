import {
  useMotionValue,
  useReducedMotion,
  type MotionValue,
} from "framer-motion"
import { useSetAtom } from "jotai"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
} from "react"
import { lightSweepAtom } from "../../../state/lightSweepAtom"
import { nameEchoAtom } from "../../../state/nameEchoAtom"
import useLightHold from "../../components/useLightHold"

interface NameWeightPlay {
  headingRef: RefObject<HTMLHeadingElement | null>
  lettersRef: RefObject<HTMLSpanElement | null>
  registerLetter: (index: number, element: HTMLElement | null) => void
  registerSheen: (index: number, element: HTMLElement | null) => void
  pointerX: MotionValue<number>
  pointerY: MotionValue<number>
  startReveal: (definition: unknown) => void
  finishReveal: (definition: unknown) => void
}

/** The name heading's weight; every letter keeps the width it has at it. */
export const restWeight = 600
/**
 * The step the heading's weight moves in, in the reveal and in the wave. Each
 * weight of a variable font is its own font instance, which the browser builds
 * during layout the first time the weight is used, so whole steps keep the
 * weights to a bounded set of cached instances instead of a new one for nearly
 * every letter on every frame.
 */
export const weightStep = 10
const thinWeight = 540
const boldWeight = 800
const waveMs = 1500
/** One frame at 60 Hz, the step the easing factors are tuned for. */
const frameMs = 1000 / 60
/** Caps a frame's step after a stall, such as a background tab. */
const maxStepMs = 64

/**
 * Turns an easing factor tuned for one 60 Hz frame into the factor for the
 * time that actually passed, so the glow and the wave run at the same speed on
 * 60, 120 and 144 Hz displays.
 *
 * @param factor - The share of the way to the target covered per 60 Hz frame.
 * @param elapsed - The time since the previous frame, in milliseconds.
 * @returns The share of the way to cover in this frame.
 */
function easeStep(factor: number, elapsed: number): number {
  return 1 - Math.pow(1 - factor, elapsed / frameMs)
}

/**
 * Plays the name heading. Once the letters are in, the letters nearest a
 * mouse pointer glow softly in the accent, while their weight, spacing and
 * baseline stay put. On touch screens a weight wave runs through the name
 * when the reveal ends, and tapping the name repeats it; a mouse click or a
 * scroll that starts on the name doesn't. It also gives the sheen the
 * pointer's position relative to the heading.
 *
 * The name also lights the background. It keeps the directed light dark from
 * its first paint (`useLightHold`) and lights it as the reveal starts. The
 * start of the reveal also sends two bands of light across the background
 * together, unless motion is reduced: the sweep from the left through
 * `lightSweepAtom`, and the echo from the bottom up (`LightEcho`, `DotEcho`)
 * through `nameEchoAtom`. Every click or tap on the name, with a
 * mouse too, sends another echo. `nameEchoAtom` goes back to null when the name
 * leaves the page.
 *
 * Every letter, and its sheen copy, keeps the width it has at the heading's
 * weight, measured from a hidden copy of the letters once the font is ready
 * and whenever the heading resizes, so the weight changes never reflow the
 * lines, as the touch wave changes the weights. Reduced motion turns it all
 * off, the echo included.
 *
 * @param letterCount - How many letters the name has.
 * @param layout - Anything that changes when the letters' layout does, such
 *   as the words with their kerning, so the widths are measured again.
 * @returns The refs and element callbacks for the heading and its letters,
 *   the pointer position for the sheen, and the handler for the reveal's end.
 */
export default function useNameWeightPlay(
  letterCount: number,
  layout: unknown,
): NameWeightPlay {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const lettersRef = useRef<HTMLSpanElement>(null)
  const letterRefs = useRef<HTMLElement[]>([])
  const sheenRefs = useRef<HTMLElement[]>([])
  const revealedRef = useRef(false)
  const answerRevealRef = useRef<() => void>(() => undefined)
  const prefersReducedMotion = useReducedMotion()
  const setEcho = useSetAtom(nameEchoAtom)
  const setLightSweep = useSetAtom(lightSweepAtom)
  const releaseLight = useLightHold()
  const pointerX = useMotionValue(-1000)
  const pointerY = useMotionValue(-1000)

  /** Sends an echo of the name into the background's light. */
  const sendEcho = useCallback((): void => {
    setEcho((previous) => (previous ?? 0) + 1)
  }, [setEcho])

  useLayoutEffect(() => {
    const heading = headingRef.current
    const root = lettersRef.current
    const letters = letterRefs.current.slice(0, letterCount)
    const sheens = sheenRefs.current.slice(0, letterCount)
    if (prefersReducedMotion || !heading || !root || letters.length === 0) {
      return
    }

    const weights = letters.map(() => restWeight)
    const paintedWeights = letters.map(() => "")
    const glows = letters.map(() => 0)
    let centers = letters.map(() => ({ x: 0, y: 0 }))
    let radius = 0
    let frame = 0
    let lastFrameAt = 0
    let engaged = 0
    let engagedTarget = 0
    let pointer = { x: 0, y: 0 }
    let waveStart: number | null = null
    let active = true

    /**
     * Locks every letter, and its sheen copy, to the width it has at the
     * heading's weight, and records where each letter's centre sits. The
     * widths come from a hidden copy of the letters, so a reveal or weight
     * change in progress never skews them, and the name stays once in the
     * page text. The heading is positioned, so each letter's offsets are
     * relative to it and ignore the reveal's transforms.
     */
    const measure = (): void => {
      if (!active) {
        return
      }

      const copy = root.cloneNode(true) as HTMLSpanElement
      copy.style.cssText = "position:absolute;inset:0 0 auto;visibility:hidden"
      const copies = copy.querySelectorAll<HTMLElement>("[data-letter]")
      copies.forEach((letter) => {
        letter.style.width = ""
        letter.style.fontWeight = ""
      })
      heading.append(copy)
      const widths = Array.from(
        copies,
        (letter) => `${letter.getBoundingClientRect().width}px`,
      )
      copy.remove()
      letters.forEach((letter, index) => {
        letter.style.width = widths[index]
        if (sheens[index]) {
          sheens[index].style.width = widths[index]
        }
      })
      centers = letters.map((letter) => ({
        x: letter.offsetLeft + letter.offsetWidth / 2,
        y: letter.offsetTop + letter.offsetHeight / 2,
      }))
      radius = Number.parseFloat(getComputedStyle(heading).fontSize) * 1.35
    }
    measure()
    void document.fonts.ready.then(measure)
    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(heading)

    /**
     * Writes each letter's current weight and accent halo to it, and the
     * weight to its sheen copy. The weight is snapped to `weightStep`, and
     * written only when the step changed, so a frame that stays within a step
     * changes no font instance and no text layout. The halo's strength and spread come from the
     * theme's `--cv-name-glow-*` tokens, so a theme change updates it at once.
     */
    const paint = (): void => {
      letters.forEach((letter, index) => {
        const glow = glows[index]
        const weight = String(
          Math.round(weights[index] / weightStep) * weightStep,
        )
        if (weight !== paintedWeights[index]) {
          paintedWeights[index] = weight
          letter.style.fontWeight = weight
          if (sheens[index]) {
            sheens[index].style.fontWeight = weight
          }
        }
        letter.style.filter =
          glow > 0.01
            ? `drop-shadow(0 0 var(--cv-name-glow-spread) color-mix(in srgb, var(--cv-accent) calc(${glow.toFixed(3)} * var(--cv-name-glow-strength) * 1%), transparent))`
            : ""
      })
    }

    /**
     * Eases every letter toward its target weight and glow for one frame, and
     * asks for another frame while anything is still moving. A running wave
     * sets the weight targets by each letter's place in the name and keeps the
     * glow off; otherwise the mouse pointer's distance sets the glow, scaled
     * by how engaged it is, and the weight rests.
     *
     * @param now - The frame's timestamp.
     */
    const tick = (now: number): void => {
      frame = 0
      const elapsed = lastFrameAt
        ? Math.min(now - lastFrameAt, maxStepMs)
        : frameMs
      lastFrameAt = now
      const settle = easeStep(0.22, elapsed)
      engaged += (engagedTarget - engaged) * easeStep(0.12, elapsed)
      const bounds = heading.getBoundingClientRect()
      let isMoving = Math.abs(engagedTarget - engaged) > 0.005

      let waveProgress: number | null = null
      if (waveStart !== null) {
        waveProgress = (now - waveStart) / waveMs
        if (waveProgress > 1.25) {
          waveStart = null
          waveProgress = null
        } else {
          isMoving = true
        }
      }

      letters.forEach((_, index) => {
        let focus = 0
        if (waveProgress !== null) {
          const position =
            letters.length > 1 ? index / (letters.length - 1) : 0.5
          const distance = (position - waveProgress * 1.2 + 0.1) / 0.16
          focus = Math.exp(-distance * distance)
        } else if (engaged > 0.001) {
          const distance =
            Math.hypot(
              pointer.x - bounds.left - centers[index].x,
              (pointer.y - bounds.top - centers[index].y) * 1.6,
            ) / radius
          focus = Math.exp(-distance * distance) * engaged
        }

        const targetWeight =
          waveProgress !== null
            ? thinWeight + (boldWeight - thinWeight) * focus
            : restWeight
        const targetGlow = waveProgress !== null ? 0 : focus
        weights[index] += (targetWeight - weights[index]) * settle
        glows[index] += (targetGlow - glows[index]) * settle
        if (
          Math.abs(targetWeight - weights[index]) > 0.5 ||
          Math.abs(targetGlow - glows[index]) > 0.005
        ) {
          isMoving = true
        }
      })

      paint()
      if (isMoving) {
        frame = requestAnimationFrame(tick)
      } else {
        lastFrameAt = 0
      }
    }

    /** Schedules a frame unless one is already pending. */
    const requestTick = (): void => {
      if (!frame) {
        frame = requestAnimationFrame(tick)
      }
    }

    /**
     * Follows a mouse pointer anywhere on the page: moves the sheen to it,
     * and once the letters are in, engages the glow while the pointer
     * is within one line height of the heading.
     *
     * @param event - The pointer move.
     */
    const followPointer = (event: PointerEvent): void => {
      if (event.pointerType !== "mouse") {
        return
      }

      const bounds = heading.getBoundingClientRect()
      pointerX.set(event.clientX - bounds.left)
      pointerY.set(event.clientY - bounds.top)
      if (!revealedRef.current) {
        return
      }

      const reach = radius / 1.35
      pointer = { x: event.clientX, y: event.clientY }
      engagedTarget =
        event.clientX > bounds.left - reach &&
        event.clientX < bounds.right + reach &&
        event.clientY > bounds.top - reach &&
        event.clientY < bounds.bottom + reach
          ? 1
          : 0
      requestTick()
    }

    /** Sends one weight wave through the name, once the letters are in. */
    const startWave = (): void => {
      if (!revealedRef.current) {
        return
      }

      waveStart = performance.now()
      requestTick()
    }

    /**
     * Answers the end of the reveal: on touch screens, where no pointer hovers
     * the name, starts the weight wave.
     */
    const answerReveal = (): void => {
      if (window.matchMedia("(hover: none)").matches) {
        startWave()
      }
    }

    /**
     * Answers a click or tap on the name once the letters are in: sends an
     * echo, and on touch screens repeats the weight wave. A click fires for a
     * tap but not for a scroll that starts on the name.
     */
    const answerClick = (): void => {
      if (!revealedRef.current) {
        return
      }

      sendEcho()
      if (window.matchMedia("(hover: none)").matches) {
        startWave()
      }
    }

    answerRevealRef.current = answerReveal
    window.addEventListener("pointermove", followPointer, { passive: true })
    heading.addEventListener("click", answerClick)

    return () => {
      active = false
      if (frame) {
        cancelAnimationFrame(frame)
      }
      answerRevealRef.current = () => undefined
      resizeObserver.disconnect()
      window.removeEventListener("pointermove", followPointer)
      heading.removeEventListener("click", answerClick)
      letters.forEach((letter) => {
        letter.style.width = ""
        letter.style.fontWeight = ""
        letter.style.filter = ""
      })
      sheens.forEach((sheen) => {
        sheen.style.width = ""
        sheen.style.fontWeight = ""
      })
    }
  }, [layout, letterCount, prefersReducedMotion, pointerX, pointerY, sendEcho])

  useEffect(() => () => setEcho(null), [setEcho])

  /**
   * Keeps a letter's element by its place in the name.
   *
   * @param index - The letter's place in the whole name.
   * @param element - The letter's element, or null when it unmounts.
   */
  const registerLetter = (index: number, element: HTMLElement | null): void => {
    if (element) {
      letterRefs.current[index] = element
    }
  }

  /**
   * Keeps a letter's sheen copy by its place in the name.
   *
   * @param index - The letter's place in the whole name.
   * @param element - The sheen copy's element, or null when it unmounts.
   */
  const registerSheen = (index: number, element: HTMLElement | null): void => {
    if (element) {
      sheenRefs.current[index] = element
    }
  }

  /**
   * Lights the background's directed light as the reveal starts and, unless
   * motion is reduced, sends the sweep and the echo across it in the same
   * frame.
   *
   * @param definition - The variant that started animating.
   */
  const startReveal = (definition: unknown): void => {
    if (definition !== "visible") {
      return
    }

    releaseLight()
    if (!prefersReducedMotion) {
      setLightSweep((count) => count + 1)
      sendEcho()
    }
  }

  /**
   * Marks the letters as in once the reveal ends, and answers it on touch
   * screens with the weight wave.
   *
   * @param definition - The variant that finished animating.
   */
  const finishReveal = (definition: unknown): void => {
    if (definition !== "visible") {
      return
    }

    revealedRef.current = true
    answerRevealRef.current()
  }

  return {
    headingRef,
    lettersRef,
    registerLetter,
    registerSheen,
    pointerX,
    pointerY,
    startReveal,
    finishReveal,
  }
}
