import {
  cancelFrame,
  frame,
  useReducedMotion,
  type FrameData,
  type MotionValue,
} from "framer-motion"
import { useStore } from "jotai"
import { useEffect, useRef, type JSX } from "react"
import { nameEchoAtom } from "../../state/nameEchoAtom"

interface DotEchoProps {
  spotlightX: MotionValue<number>
  spotlightY: MotionValue<number>
}

interface Wave {
  x: number
  y: number
  age: number
  radius: number
  nearSquared: number
  farSquared: number
  fade: number
}

/** The dot grid's cell, the same as in `bg-cv-dots`. */
const cell = 24
/** A dot's solid radius in `bg-cv-dots`, which fades out by 1.5px. */
const dotRadius = 1
/** How fast a wave spreads, in pixels per millisecond. */
const waveSpeed = 0.75
/** The width of a wave's crest, in pixels. */
const waveWidth = 34
/** How far from a wave's radius its crest still lights a dot, in pixels. */
const crestReach = waveWidth * 2.5
const waveMs = 2600
/** The most waves that run at once; a new one replaces the oldest. */
const maxWaves = 4
/** How far a dot on a crest moves away from the wave's start, in pixels. */
const wavePush = 3
/** How much a dot on a crest grows, in pixels. */
const waveSwell = 1.4
/** How much a dot right under the spotlight grows, in pixels. */
const spotlightSwell = 0.6
/**
 * The accent strength of `bg-cv-dots-lit`, the dots under the spotlight,
 * which no lit dot goes past.
 */
const litStrength = 0.75
/** Half the width of the 28rem `bg-cv-dots-lit` layer, in rem. */
const litRadiusRem = 14
/** Above this many CSS pixels the canvas draws at 1x, so it stays small. */
const largeArea = 4_000_000

/**
 * Tells how strongly the static dots show at a point, with the falloff of
 * `bg-cv-dots-fade`: `radial-gradient(70% 60% at 50% 30%, #000 20%,
 * transparent 100%)`.
 *
 * @param x - The point's distance from the layer's left edge.
 * @param y - The point's distance from the layer's top edge.
 * @param width - The layer's width.
 * @param height - The layer's height.
 * @returns The mask's opacity at the point, from 0 to 1.
 */
function fadeMask(x: number, y: number, width: number, height: number): number {
  const distance = Math.hypot(
    (x - width * 0.5) / (width * 0.7),
    (y - height * 0.3) / (height * 0.6),
  )
  return Math.min(1, Math.max(0, 1 - (distance - 0.2) / 0.8))
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
 * The CV name's echo in the background's dots: a canvas over the static dot
 * layers that draws only the dots a wave or the spotlight reaches, on the
 * same 24px grid and through the same fade mask, so they land on the static
 * dots. Every echo in `nameEchoAtom` starts a wave from its point. The wave
 * spreads at 0.75px/ms and fades out over 2.6s, and the dots on its crest
 * light up in the accent, at most as strongly as the lit dots, grow, and
 * move a few pixels away from the wave's start. While the CV shows, the dots
 * under a mouse's spotlight also grow from 1px to 1.6px in their own colours,
 * on the spotlight's spring, without moving.
 *
 * It draws on Framer Motion's frame loop, after the spring has moved, so the
 * dots keep up with the spotlight, and only while something moves. At rest
 * the canvas stays transparent and draws nothing, and a hidden tab pauses
 * it. The canvas takes its size on the first draw, and again on the next
 * draw after a resize or a move to a screen with another pixel density, at
 * most twice the CSS pixels and once on a very large page, so other pages
 * keep an empty canvas. The colours come from `--cv-dot` and `--cv-accent`
 * and are read again when the theme changes. Reduced motion leaves the
 * canvas out, and print and forced colours hide it.
 *
 * @param props - The component props.
 * @param props.spotlightX - The spotlight's spring-following x position.
 * @param props.spotlightY - The spotlight's spring-following y position.
 * @returns The echo's canvas, or nothing for reduced motion.
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
    let needsLayout = true
    let isPainted = false
    let layoutPixelRatio = 0
    let isNameShown = store.get(nameEchoAtom) !== null
    const waves: Wave[] = []

    /** Reads the current theme's dot and accent colours. */
    const readColors = (): void => {
      const styles = getComputedStyle(document.documentElement)
      dotColor = styles.getPropertyValue("--cv-dot").trim()
      accent = styles.getPropertyValue("--cv-accent").trim()
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
      litRadius =
        parseFloat(getComputedStyle(document.documentElement).fontSize) *
        litRadiusRem

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
     * Ages the waves by one frame, drops the finished ones in place, and
     * works out each wave's radius, fade and the squared distances between
     * which its crest lights dots, so the dot loop can skip the rest of the
     * grid without a square root.
     *
     * @param delta - The time since the previous frame, in milliseconds.
     */
    const ageWaves = (delta: number): void => {
      let alive = 0
      for (const wave of waves) {
        wave.age += delta
        if (wave.age < waveMs) {
          wave.radius = wave.age * waveSpeed
          wave.nearSquared = Math.max(0, wave.radius - crestReach) ** 2
          wave.farSquared = (wave.radius + crestReach) ** 2
          wave.fade = (1 - wave.age / waveMs) ** 2
          waves[alive++] = wave
        }
      }
      waves.length = alive
    }

    /**
     * Draws one frame: clears the previous one, ages the waves, and draws
     * the dots under the spotlight and on the crests. A spotlight dot is a
     * ring around the static dot in the static and lit dots' colours, so the
     * dot looks the same, only larger. Asks for another frame while a wave
     * runs; the spotlight's spring asks for its own.
     *
     * @param frameData - The frame's timing.
     * @param frameData.delta - The time since the previous frame, in
     *   milliseconds, which ages the waves.
     */
    const draw = ({ delta }: FrameData): void => {
      if (needsLayout || window.devicePixelRatio !== layoutPixelRatio) {
        layOut()
      }
      if (isPainted) {
        context.setTransform(1, 0, 0, 1, 0, 0)
        context.clearRect(0, 0, canvas.width, canvas.height)
        isPainted = false
      }

      ageWaves(delta)
      if (waves.length === 0 && !isNameShown) {
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
        const glow =
          spotSquared < litRadiusSquared
            ? litMask(Math.sqrt(spotSquared), litRadius)
            : 0
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
          isPainted = true
        }

        let crest = 0
        let pushX = 0
        let pushY = 0
        for (const wave of waves) {
          const dx = x - wave.x
          const dy = y - wave.y
          const distanceSquared = dx * dx + dy * dy
          if (
            distanceSquared < wave.nearSquared ||
            distanceSquared > wave.farSquared
          ) {
            continue
          }

          const distance = Math.sqrt(distanceSquared)
          const band = (distance - wave.radius) / waveWidth
          const strength = Math.exp(-band * band) * wave.fade
          const push = (wavePush * strength) / (distance || 1)
          crest = Math.max(crest, strength)
          pushX += dx * push
          pushY += dy * push
        }
        if (crest * fade > 0.01) {
          context.beginPath()
          context.arc(
            x + pushX,
            y + pushY,
            dotRadius + waveSwell * crest,
            0,
            Math.PI * 2,
          )
          context.fillStyle = accent
          context.globalAlpha = litStrength * crest * fade
          context.fill()
          isPainted = true
        }
      }
      context.globalAlpha = 1

      if (waves.length > 0) {
        frame.render(draw)
      }
    }

    /**
     * Starts a wave from a new echo of the name, moved from page to layer
     * coordinates, and turns the spotlight's swelling on while the name is
     * on the page and off once it leaves.
     */
    const answerEcho = (): void => {
      const echo = store.get(nameEchoAtom)
      isNameShown = echo !== null
      if (echo) {
        const bounds = layer.getBoundingClientRect()
        if (waves.length === maxWaves) {
          waves.shift()
        }
        waves.push({
          x: echo.x - window.scrollX - bounds.left,
          y: echo.y - window.scrollY - bounds.top,
          age: 0,
          radius: 0,
          nearSquared: 0,
          farSquared: 0,
          fade: 1,
        })
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
      if (isPainted || waves.length > 0) {
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
    const stopSpotlightX = spotlightX.on("change", followSpotlight)
    const stopSpotlightY = spotlightY.on("change", followSpotlight)

    return () => {
      cancelFrame(draw)
      resizeObserver.disconnect()
      themeObserver.disconnect()
      stopEchoes()
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
