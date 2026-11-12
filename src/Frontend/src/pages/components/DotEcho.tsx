import {
  cancelFrame,
  cubicBezier,
  frame,
  useReducedMotion,
  type FrameData,
  type MotionValue,
} from "framer-motion"
import { useStore } from "jotai"
import { useEffect, useRef, type JSX } from "react"
import { lightSweepAtom } from "../../state/lightSweepAtom"
import { maxEchoes, nameEchoAtom } from "../../state/nameEchoAtom"

interface DotEchoProps {
  spotlightX: MotionValue<number>
  spotlightY: MotionValue<number>
}

type BandKind = "sweep" | "echo"

interface Band {
  kind: BandKind
  startedAt: number
  middle: number
  width: number
  fade: number
}

/** The dot grid's cell, the same as in `bg-cv-dots`. */
const cell = 24
/** A dot's solid radius in `bg-cv-dots`, which fades out by 1.5px. */
const dotRadius = 1
/** How much a dot under a band grows, in pixels. */
const bandSwell = 1.4
/** How much a dot right under the spotlight grows, in pixels. */
const spotlightSwell = 0.6
/**
 * The accent strength of `bg-cv-dots-lit`, the dots under the spotlight,
 * which no lit dot's accent goes past. The hot core of a dot under a band is
 * the one exception: at the band's crest it is fully opaque, because it is
 * only a pixel or two wide and has to read as the light's hottest point.
 */
const litStrength = 0.75
/**
 * The share of the `bg-cv-dots-lit` layer's radius over which its light runs
 * from the hot core to the accent.
 */
const coreReach = 0.45
/** The hot core's radius in a dot under a band, as a share of the dot's. */
const coreShare = 0.6
/** Half the width of the 28rem `bg-cv-dots-lit` layer, in rem. */
const litRadiusRem = 14
/** Above this many CSS pixels the canvas draws at 1x, so it stays small. */
const largeArea = 4_000_000
/** How long a band takes, as in its CSS animation. */
const bandMs = 1800
/** The curve of `animate-cv-light-sweep` and `animate-cv-light-echo`. */
const bandEase = cubicBezier(0.45, 0, 0.2, 1)
/** Where a band's middle starts, as a share of the viewport along its way. */
const bandStart = -0.35
/** How far a band's middle travels, as a share of the viewport along its way. */
const bandTravel = 1.7
/** The last share of the run, in which both CSS animations fade out. */
const bandFadeShare = 0.3
/** The width of the sweep's crest, as a share of the viewport's width. */
const sweepBandShare = 0.13
/** The least height of the sweep's box, in rem. */
const sweepBoxRem = 48
/** The width of the echo's crest, as a share of the viewport's height. */
const echoBandShare = 0.12
/**
 * The way each band moves: the sweep at the card foil's 105°, and the echo up
 * the page, a quarter of a circle from it.
 */
const bandDirections: Record<BandKind, { x: number; y: number }> = {
  sweep: {
    x: Math.sin((105 * Math.PI) / 180),
    y: -Math.cos((105 * Math.PI) / 180),
  },
  echo: {
    x: Math.sin((15 * Math.PI) / 180),
    y: -Math.cos((15 * Math.PI) / 180),
  },
}

/**
 * Tells how strongly the dots show at a point, with the falloff of the first
 * mask of `bg-cv-dots-fade`: `radial-gradient(78% 72% at 20% 12%, #000 18%,
 * transparent 100%)`. Its second mask, which hides the static dots under the
 * resting band, is left out, so a passing band lights the dots there too.
 *
 * @param x - The point's distance from the layer's left edge.
 * @param y - The point's distance from the layer's top edge.
 * @param width - The layer's width.
 * @param height - The layer's height.
 * @returns The mask's opacity at the point, from 0 to 1.
 */
function fadeMask(x: number, y: number, width: number, height: number): number {
  const distance = Math.hypot(
    (x - width * 0.2) / (width * 0.78),
    (y - height * 0.12) / (height * 0.72),
  )
  return Math.min(1, Math.max(0, 1 - (distance - 0.18) / 0.82))
}

/**
 * Tells how strongly the spotlight lights a dot, with the falloff of the
 * `bg-cv-dots-lit` mask: `radial-gradient(closest-side, #000 15%,
 * transparent)`.
 *
 * @param distance - The dot's distance from the spotlight's centre.
 * @param radius - Half the width of the lit layer.
 * @returns The mask's opacity at the dot, from 0 to 1.
 */
function litMask(distance: number, radius: number): number {
  return Math.min(1, Math.max(0, 1 - (distance / radius - 0.15) / 0.85))
}

/**
 * The lit dots of the background's light: a canvas over the static dot layers
 * that draws only the dots a band of light or the spotlight reaches, on the
 * same 24px grid and through the first mask of `bg-cv-dots-fade`, so they
 * land on the static dots, and under the resting band, where none show, they
 * appear on their own. Every count in `lightSweepAtom` carries a band through the dots from
 * the left, in step with `LightSweep`, and every echo in `nameEchoAtom` carries
 * one from the bottom up, in step with `LightEcho`. The dots under a band
 * light up in the accent, at most as strongly as the lit dots, with a smaller
 * hot core in their middle near the band's crest, and grow without moving. While the CV shows, the dots under a mouse's spotlight also grow from
 * 1px to 1.6px in their own colours, on the spotlight's spring, without moving, and turn
 * toward the hot core the nearer they are to the pointer.
 *
 * It draws on Framer Motion's frame loop, after the spring has moved, so the
 * dots keep up with the spotlight, and only while something moves. At rest
 * the canvas stays transparent and draws nothing, and a hidden tab pauses
 * it. The canvas takes its size on the first draw, and again on the next
 * draw after a resize or a move to a screen with another pixel density, at
 * most twice the CSS pixels and once on a very large page, so other pages
 * keep an empty canvas. The colours come from `--cv-dot`, `--cv-accent` and
 * `--cv-accent-core` and are read again when the theme changes. Reduced motion leaves the
 * canvas out, and print and forced colours hide it.
 *
 * @param props - The component props.
 * @param props.spotlightX - The spotlight's spring-following x position.
 * @param props.spotlightY - The spotlight's spring-following y position.
 * @returns The lit dots' canvas, or nothing for reduced motion.
 */
export default function DotEcho({
  spotlightX,
  spotlightY,
}: DotEchoProps): JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const store = useStore()
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    const layer = canvas?.parentElement
    const context = canvas?.getContext("2d")
    if (prefersReducedMotion || !canvas || !layer || !context) {
      return
    }

    let width = 0
    let height = 0
    let ratio = 1
    let litRadius = 0
    let dots = new Float32Array(0)
    let dotColor = ""
    let accent = ""
    let core = ""
    let needsLayout = true
    let isPainted = false
    let layoutPixelRatio = 0
    let isNameShown = store.get(nameEchoAtom) !== null
    let bands: Band[] = []
    let rootFontSize = 16

    /** Reads the current theme's dot, accent and hot core colours. */
    const readColors = (): void => {
      const styles = getComputedStyle(document.documentElement)
      dotColor = styles.getPropertyValue("--cv-dot").trim()
      accent = styles.getPropertyValue("--cv-accent").trim()
      core = styles.getPropertyValue("--cv-accent-core").trim()
    }

    /**
     * Sizes the canvas to the layer and the screen's pixel density, which
     * also clears it, and records every dot's centre and how strongly the
     * fade mask shows it.
     */
    const layOut = (): void => {
      width = layer.clientWidth
      height = layer.clientHeight
      layoutPixelRatio = window.devicePixelRatio
      ratio = Math.min(
        layoutPixelRatio || 1,
        width * height > largeArea ? 1 : 2,
      )
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      rootFontSize = parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      )
      litRadius = rootFontSize * litRadiusRem

      const columns = Math.ceil(width / cell)
      const rows = Math.ceil(height / cell)
      dots = new Float32Array(columns * rows * 3)
      for (let row = 0, index = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++, index += 3) {
          const x = column * cell + cell / 2
          const y = row * cell + cell / 2
          dots[index] = x
          dots[index + 1] = y
          dots[index + 2] = fadeMask(x, y, width, height)
        }
      }
      needsLayout = false
      isPainted = false
    }

    /**
     * Moves the bands to a frame's time, drops the finished ones in place, and
     * works out each band's middle along its direction, width and fade.
     *
     * @param timestamp - The frame's time, the clock of the CSS animations.
     */
    const moveBands = (timestamp: number): void => {
      let alive = 0
      for (const band of bands) {
        /** How far through its run the band is, from 0 to 1. */
        const time = Math.max(0, timestamp - band.startedAt) / bandMs
        if (time < 1) {
          /** How far along the viewport the band's middle is. */
          const along = bandStart + bandTravel * bandEase(time)
          const isSweep = band.kind === "sweep"
          const middleX = isSweep
            ? window.innerWidth * along
            : window.innerWidth / 2
          const middleY = isSweep
            ? Math.max(window.innerHeight, sweepBoxRem * rootFontSize) / 2
            : window.innerHeight * (1 - along)
          const direction = bandDirections[band.kind]
          band.middle = middleX * direction.x + middleY * direction.y
          band.width = isSweep
            ? window.innerWidth * sweepBandShare
            : window.innerHeight * echoBandShare
          band.fade = Math.min(1, (1 - time) / bandFadeShare)
          bands[alive++] = band
        }
      }
      bands.length = alive
    }

    /**
     * Draws one frame: clears the previous one, moves the bands, and draws the
     * dots under the spotlight and under the bands. A spotlight dot is a ring
     * around the static dot in the static and lit dots' colours, so the dot
     * looks the same, only larger, with the hot core over it near the pointer.
     * A dot under a band is the accent with a smaller hot core in its middle. Asks for another frame while a band runs;
     * the first frame without one clears the last band, and the spotlight's
     * spring asks for its own.
     *
     * @param frameData - The frame's timing.
     * @param frameData.timestamp - The frame's time, which keeps the bands on
     *   the clock of their CSS animations, unlike the capped `delta`.
     */
    const draw = ({ timestamp }: FrameData): void => {
      if (needsLayout || window.devicePixelRatio !== layoutPixelRatio) {
        layOut()
      }
      if (isPainted) {
        context.setTransform(1, 0, 0, 1, 0, 0)
        context.clearRect(0, 0, canvas.width, canvas.height)
        isPainted = false
      }

      moveBands(timestamp)
      if (bands.length === 0 && !isNameShown) {
        return
      }

      const spotX = spotlightX.get()
      const spotY = spotlightY.get()
      const litRadiusSquared = isNameShown ? litRadius * litRadius : 0
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      for (let index = 0; index < dots.length; index += 3) {
        const x = dots[index]
        const y = dots[index + 1]
        const fade = dots[index + 2]

        const spotSquared = (x - spotX) ** 2 + (y - spotY) ** 2
        /** The dot's distance from the spotlight's middle. */
        const spotDistance =
          spotSquared < litRadiusSquared ? Math.sqrt(spotSquared) : 0
        const glow =
          spotSquared < litRadiusSquared ? litMask(spotDistance, litRadius) : 0
        if (glow > 0.01) {
          context.beginPath()
          context.arc(x, y, dotRadius + spotlightSwell * glow, 0, Math.PI * 2)
          context.moveTo(x + dotRadius, y)
          context.arc(x, y, dotRadius, 0, Math.PI * 2, true)
          context.fillStyle = dotColor
          context.globalAlpha = fade
          context.fill()
          context.fillStyle = accent
          context.globalAlpha = litStrength * glow
          context.fill()
          /** How much of the hot core the spotlight's light holds at the dot. */
          const heat = 1 - spotDistance / (litRadius * coreReach)
          if (heat > 0) {
            context.fillStyle = core
            context.globalAlpha = litStrength * glow * heat
            context.fill()
          }
          isPainted = true
        }

        let lit = 0
        for (const band of bands) {
          const direction = bandDirections[band.kind]
          /** The dot's distance from the band's middle, in crest widths. */
          const distance =
            (x * direction.x + y * direction.y - band.middle) / band.width
          lit = Math.max(lit, Math.exp(-distance * distance) * band.fade)
        }
        if (lit * fade > 0.01) {
          context.beginPath()
          context.arc(x, y, dotRadius + bandSwell * lit, 0, Math.PI * 2)
          context.fillStyle = accent
          context.globalAlpha = litStrength * lit * fade
          context.fill()
          /** The hot core's strength, which shows only near the band's crest. */
          const coreStrength = lit * lit * fade
          if (coreStrength > 0.01) {
            context.beginPath()
            context.arc(
              x,
              y,
              (dotRadius + bandSwell * lit) * coreShare,
              0,
              Math.PI * 2,
            )
            context.fillStyle = core
            context.globalAlpha = coreStrength
            context.fill()
          }
          isPainted = true
        }
      }
      context.globalAlpha = 1

      if (bands.length > 0) {
        frame.render(draw)
      }
    }

    /**
     * Starts a band through the dots.
     *
     * @param kind - Which light the band follows.
     */
    const startBand = (kind: BandKind): void => {
      bands.push({
        kind,
        startedAt: performance.now(),
        middle: 0,
        width: 1,
        fade: 1,
      })
    }

    /** Starts the sweep's band through the dots. */
    const startSweep = (): void => {
      startBand("sweep")
      frame.render(draw)
    }

    /**
     * Tells whether a band is the echo's.
     *
     * @param band - The band.
     * @returns Whether it follows an echo.
     */
    const isEcho = (band: Band): boolean => band.kind === "echo"

    /**
     * Starts a band for a new echo of the name, which replaces the oldest echo
     * when `maxEchoes` already run, and turns the spotlight's swelling on while
     * the name is on the page. Once the name leaves, it drops the echoes along
     * with `LightEcho`'s bands and turns the swelling off.
     */
    const answerEcho = (): void => {
      isNameShown = store.get(nameEchoAtom) !== null
      if (!isNameShown) {
        bands = bands.filter((band) => !isEcho(band))
      } else {
        if (bands.filter(isEcho).length === maxEchoes) {
          bands.splice(bands.findIndex(isEcho), 1)
        }
        startBand("echo")
      }
      frame.render(draw)
    }

    /** Redraws the swollen dots while the spotlight's spring moves. */
    const followSpotlight = (): void => {
      if (isNameShown) {
        frame.render(draw)
      }
    }

    /** Lays the dots out again on the next draw, and redraws what shows. */
    const relayOut = (): void => {
      needsLayout = true
      if (isPainted || bands.length > 0) {
        frame.render(draw)
      }
    }

    /** Reads the new theme's colours and redraws what shows in them. */
    const followTheme = (): void => {
      readColors()
      if (isPainted) {
        frame.render(draw)
      }
    }
    readColors()
    const resizeObserver = new ResizeObserver(relayOut)
    resizeObserver.observe(layer)
    const themeObserver = new MutationObserver(followTheme)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })
    const stopEchoes = store.sub(nameEchoAtom, answerEcho)
    const stopSweeps = store.sub(lightSweepAtom, startSweep)
    const stopSpotlightX = spotlightX.on("change", followSpotlight)
    const stopSpotlightY = spotlightY.on("change", followSpotlight)

    return () => {
      cancelFrame(draw)
      resizeObserver.disconnect()
      themeObserver.disconnect()
      stopEchoes()
      stopSweeps()
      stopSpotlightX()
      stopSpotlightY()
    }
  }, [prefersReducedMotion, spotlightX, spotlightY, store])

  return prefersReducedMotion ? null : (
    <canvas
      ref={canvasRef}
      width={0}
      height={0}
      className="absolute inset-0 size-full print:hidden forced-colors:hidden"
    />
  )
}
