import { cubicBezier } from "framer-motion"

/** A point on the background's layer, in CSS pixels. */
export interface Point {
  x: number
  y: number
}

/**
 * One trace of light: a short piece of light with a hot head and a fading
 * tail that runs along a route of the dot grid, from dot to dot with right
 * angles, once.
 */
export interface Trace {
  /** The route's corners, from its start to its end. */
  points: Point[]
  /** How far along the route each corner is, in CSS pixels. */
  distances: number[]
  /** The route's length, in CSS pixels. */
  length: number
  /** The time of the frame the trace started in. */
  startedAt: number
  /** Whether the name's echo sent it, so it leaves with the name. */
  isEcho: boolean
}

/** The colours a trace is drawn in. */
export interface TraceColors {
  /** The tail's colour, the accent. */
  accent: string
  /** The head's colour, the hot core. */
  core: string
}

/**
 * Tells how strongly the dots show at a point, from 0 to 1, so a trace stays
 * where the dots show and fades with them.
 */
type Visibility = (x: number, y: number) => number

/** How long a trace takes to run its route, in milliseconds. */
const traceMs = 450
/** The time between two traces of one band, in milliseconds. */
export const traceStaggerMs = 100
/** The most traces that run at once, for all the bands together. */
export const maxTraces = 4
/** How many traces each band tries to send. */
export const tracesPerBand = 3
/** The length of a trace's lit piece, as a share of its route. */
const tailShare = 0.25
/** The curve a trace's head runs on: it sets off quickly and settles. */
const traceEase = cubicBezier(0.3, 0, 0.25, 1)
/** The trace's line width, in CSS pixels. */
const lineWidth = 1.25
/** How many pieces the tail's fade is drawn in. */
const tailSteps = 12
/**
 * The tail's strongest accent, at its front, the same as the lit dots'
 * strength, which only the hot head goes past.
 */
const tailStrength = 0.75
/** The length of the head's hot core along the route, in CSS pixels. */
const headLength = 6
/** The radius of the soft light around the head, in CSS pixels. */
const bloomRadius = 2.75
/** The strength of the soft light around the head. */
const bloomStrength = 0.3
/** The share of the run over which a trace fades in, and out at its end. */
const fadeShare = 0.15
/** The least that the dots must show at every dot of a route. */
const minVisibility = 0.45
/** How many routes are tried for a trace before it is left out. */
const routeAttempts = 8

/**
 * The state of `nextRandom`, which moves on with every number it gives. It is
 * seeded from the clock once, so each page load draws other routes.
 */
let randomState = Date.now() >>> 0

/**
 * Gives the next number of a small seeded generator (Mulberry32). The routes
 * only need to vary for the eye, so a clock-seeded sequence is enough, and
 * nothing here needs numbers that can't be guessed.
 *
 * @returns A number from 0 up to, but not including, 1.
 */
function nextRandom(): number {
  randomState = (randomState + 0x6d_2b_79_f5) >>> 0
  let mixed = Math.imul(randomState ^ (randomState >>> 15), 1 | randomState)
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)
  return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296
}

/**
 * Picks a whole number of cells from a range.
 *
 * @param least - The smallest number.
 * @param most - The largest number.
 * @returns A number from `least` to `most`, both included.
 */
function cellsBetween(least: number, most: number): number {
  return least + Math.floor(nextRandom() * (most - least + 1))
}

/**
 * Plans one route from a dot: legs along the band's way with one or two
 * short turns to the side between them, all on the dot grid.
 *
 * @param start - The dot the route starts from.
 * @param way - The band's way along the grid, one cell long.
 * @param cells - About how many cells the route runs.
 * @returns The route's corners.
 */
function planRoute(start: Point, way: Point, cells: number): Point[] {
  /** How many times the route turns to the side, once or twice. */
  const turns = nextRandom() < 0.5 ? 1 : 2
  /** Which side the route turns to, left or right of the band's way. */
  const sideSign = nextRandom() < 0.5 ? -1 : 1
  /** One cell's step to the side, at a right angle to the band's way. */
  const side = { x: -way.y * sideSign, y: way.x * sideSign }
  /** How many cells each turn to the side runs, one or two. */
  const jogs = Array.from({ length: turns }, () => cellsBetween(1, 2))
  /**
   * The cells left for the legs along the band's way, at least two for each
   * leg, so no leg comes out empty.
   */
  const legCells = Math.max(
    (turns + 1) * 2,
    cells - jogs.reduce((sum, jog) => sum + jog, 0),
  )
  /** The first leg's share of the legs' cells, from 30% to 55%. */
  const firstShare = 0.3 + nextRandom() * 0.25
  /** The legs' cells: all but the last one, which takes what is left. */
  const legs =
    turns === 1
      ? [Math.round(legCells * firstShare)]
      : [Math.round(legCells * firstShare * 0.7), Math.round(legCells * 0.35)]
  legs.push(legCells - legs.reduce((sum, leg) => sum + leg, 0))

  const points = [start]
  let x = start.x
  let y = start.y
  legs.forEach((leg, index) => {
    x += way.x * leg
    y += way.y * leg
    points.push({ x, y })
    if (index < jogs.length) {
      x += side.x * jogs[index]
      y += side.y * jogs[index]
      points.push({ x, y })
    }
  })
  return points
}

/**
 * Tells whether the dots show well enough along every cell of a route.
 *
 * @param points - The route's corners.
 * @param cell - The grid's cell, in CSS pixels.
 * @param visibility - How strongly the dots show at a point.
 * @returns Whether the route stays where the dots show.
 */
function isRouteVisible(
  points: Point[],
  cell: number,
  visibility: Visibility,
): boolean {
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1]
    const to = points[index]
    /** The number of cells the leg crosses. */
    const steps = Math.round(
      (Math.abs(to.x - from.x) + Math.abs(to.y - from.y)) / cell,
    )
    for (let step = 0; step <= steps; step++) {
      const share = steps === 0 ? 0 : step / steps
      if (
        visibility(
          from.x + (to.x - from.x) * share,
          from.y + (to.y - from.y) * share,
        ) < minVisibility
      ) {
        return false
      }
    }
  }
  return true
}

/**
 * Plans a trace from a band's crest: picks a dot on the line where the band's
 * light is about to reach, and a route from it along the band's way that stays
 * where the dots show. Tries a few dots along the line before it gives up.
 *
 * @param options - What the trace is planned from.
 * @param options.reach - How far along the band's way the light reaches.
 * @param options.direction - The band's way, as a unit vector.
 * @param options.way - The band's way along the grid, as one cell's step.
 * @param options.cells - About how many cells the route runs.
 * @param options.cell - The grid's cell, in CSS pixels.
 * @param options.width - The light box's width.
 * @param options.height - The light box's height.
 * @param options.visibility - How strongly the dots show at a point.
 * @param options.startedAt - The time of the frame the trace starts in.
 * @param options.isEcho - Whether the name's echo sends it.
 * @returns The trace, or null when no route fits.
 */
export function planTrace({
  reach,
  direction,
  way,
  cells,
  cell,
  width,
  height,
  visibility,
  startedAt,
  isEcho,
}: {
  reach: number
  direction: Point
  way: Point
  cells: number
  cell: number
  width: number
  height: number
  visibility: Visibility
  startedAt: number
  isEcho: boolean
}): Trace | null {
  /** Whether the band's line runs more up and down than across. */
  const isUpright = Math.abs(direction.x) > Math.abs(direction.y)
  for (let attempt = 0; attempt < routeAttempts; attempt++) {
    const across = nextRandom() * (isUpright ? height : width)
    const x = isUpright ? (reach - across * direction.y) / direction.x : across
    const y = isUpright ? across : (reach - across * direction.x) / direction.y
    const start = {
      x: Math.round((x - cell / 2) / cell) * cell + cell / 2,
      y: Math.round((y - cell / 2) / cell) * cell + cell / 2,
    }
    const points = planRoute(start, way, cells)
    /** Whether every corner of the route lies inside the light box. */
    const isInside = points.every(
      (point) =>
        point.x > 0 && point.x < width && point.y > 0 && point.y < height,
    )
    if (isInside && isRouteVisible(points, cell, visibility)) {
      const distances = [0]
      for (let index = 1; index < points.length; index++) {
        const from = points[index - 1]
        const to = points[index]
        distances.push(
          distances[index - 1] +
            Math.abs(to.x - from.x) +
            Math.abs(to.y - from.y),
        )
      }
      return {
        points,
        distances,
        length: distances.at(-1) ?? 0,
        startedAt,
        isEcho,
      }
    }
  }
  return null
}

/**
 * Finds the point a distance along a trace's route.
 *
 * @param trace - The trace.
 * @param distance - How far along the route, in CSS pixels.
 * @returns The point.
 */
function pointAlong(trace: Trace, distance: number): Point {
  let index = 1
  while (index < trace.points.length - 1 && trace.distances[index] < distance) {
    index++
  }
  const from = trace.points[index - 1]
  const to = trace.points[index]
  const legLength = trace.distances[index] - trace.distances[index - 1]
  const share =
    legLength === 0 ? 0 : (distance - trace.distances[index - 1]) / legLength
  return {
    x: from.x + (to.x - from.x) * share,
    y: from.y + (to.y - from.y) * share,
  }
}

/**
 * Adds the part of a trace's route between two distances to the context's
 * path, through the corners between them.
 *
 * @param context - The canvas context.
 * @param trace - The trace.
 * @param from - Where the part starts, in CSS pixels along the route.
 * @param to - Where the part ends, in CSS pixels along the route.
 */
function addRoutePart(
  context: CanvasRenderingContext2D,
  trace: Trace,
  from: number,
  to: number,
): void {
  const start = pointAlong(trace, from)
  context.moveTo(start.x, start.y)
  for (let index = 1; index < trace.points.length - 1; index++) {
    if (trace.distances[index] > from && trace.distances[index] < to) {
      context.lineTo(trace.points[index].x, trace.points[index].y)
    }
  }
  const end = pointAlong(trace, to)
  context.lineTo(end.x, end.y)
}

/**
 * Draws a trace at a frame's time: the lit piece, a quarter of the route long,
 * runs from the route's start to its end, where it draws itself in. Its tail
 * fades from the accent at the front to nothing, and its head is a short hot
 * core with a soft light around it. The trace fades in and out at the ends of
 * its run, and with the dots under it.
 *
 * @param context - The canvas context, scaled to CSS pixels.
 * @param trace - The trace.
 * @param timestamp - The frame's time.
 * @param colors - The tail's and the head's colours.
 * @param visibility - How strongly the dots show at a point.
 * @returns Whether the trace still runs.
 */
export function drawTrace(
  context: CanvasRenderingContext2D,
  trace: Trace,
  timestamp: number,
  colors: TraceColors,
  visibility: Visibility,
): boolean {
  /** How far through its run the trace is, from 0 to 1. */
  const time = Math.max(0, timestamp - trace.startedAt) / traceMs
  if (time >= 1) {
    return false
  }

  /** The lit piece's full length, in CSS pixels. */
  const tail = trace.length * tailShare
  /**
   * How far the head would be along the route, run past its end by the
   * tail's length, so the tail runs in after the head has stopped.
   */
  const travel = traceEase(time) * (trace.length + tail)
  /** The head's distance along the route, which stops at its end. */
  const head = Math.min(travel, trace.length)
  /** The tail's end's distance along the route, which starts at its start. */
  const tailEnd = Math.max(0, travel - tail)
  /** The length of the lit piece in this frame. */
  const lit = head - tailEnd
  if (lit < 0.5) {
    return true
  }

  /** How strongly the trace shows, as it fades in and out of its run. */
  const presence = Math.min(1, time / fadeShare, (1 - time) / fadeShare)
  /** The head's point on the route. */
  const headPoint = pointAlong(trace, head)
  /** How strongly the head shows, with the run's fade and the dots under it. */
  const headShows = presence * visibility(headPoint.x, headPoint.y)

  context.lineWidth = lineWidth
  context.lineCap = "butt"
  context.lineJoin = "miter"
  context.strokeStyle = colors.accent
  for (let step = 0; step < tailSteps; step++) {
    const from = tailEnd + (lit * step) / tailSteps
    const to = tailEnd + (lit * (step + 1)) / tailSteps
    const middle = pointAlong(trace, (from + to) / 2)
    /** The piece's place along the tail, from its end to its front. */
    const front = (step + 0.5) / tailSteps
    context.globalAlpha =
      tailStrength * front * presence * visibility(middle.x, middle.y)
    context.beginPath()
    addRoutePart(context, trace, from, to)
    context.stroke()
  }

  context.globalAlpha = headShows
  context.strokeStyle = colors.core
  context.beginPath()
  addRoutePart(context, trace, Math.max(tailEnd, head - headLength), head)
  context.stroke()

  context.beginPath()
  context.arc(headPoint.x, headPoint.y, bloomRadius, 0, Math.PI * 2)
  context.fillStyle = colors.accent
  context.globalAlpha = bloomStrength * headShows
  context.fill()
  return true
}
