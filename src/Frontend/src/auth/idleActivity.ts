import { ActivityEvent } from "../types"

/**
 * How long after the user's own press, tap, key or wheel a scroll still
 * counts as theirs. Each such scroll extends it, so momentum and scrollbar
 * drags keep counting.
 */
const userScrollWindowMs = 1000

/**
 * Tells whether a DOM event is the user's own use of the app.
 *
 * @param event - The event of one of the `ActivityEvent` types.
 * @param deliberateOnly - True while the idle warning shows, when only a press, a tap or a key continues the session.
 * @returns True when the event counts as activity.
 */
export type ActivityFilter = (event: Event, deliberateOnly: boolean) => boolean

/**
 * Creates a filter that accepts only the user's own input, so the idle time
 * isn't restarted by what the browser or the app does on its own:
 *
 * - Events the page dispatches itself (`isTrusted` false) never count.
 * - A pointer move counts only when the pointer's screen position changes.
 *   Browsers also send moves that don't move, such as the first one after
 *   the page loads under a resting pointer, and some input devices and
 *   remote-desktop tools send them repeatedly. Only the last position is
 *   kept: touches already count through their press, so telling pointers
 *   apart adds nothing.
 * - A scroll counts only right after the user's own input. A scroll from
 *   `scrollTo`, `scrollIntoView`, focus or content that changes height is
 *   trusted too, because the browser dispatches it.
 *
 * @returns The filter, which remembers the pointer's last position and the last input between calls.
 */
export function createActivityFilter(): ActivityFilter {
  let lastPointer: { x: number; y: number } | null = null
  let lastUserInputAt = Number.NEGATIVE_INFINITY

  /**
   * Tells whether an event is the user's own use of the app, and remembers
   * what the next calls compare against.
   *
   * @param event - The event of one of the `ActivityEvent` types.
   * @param deliberateOnly - True while the idle warning shows.
   * @returns True when the event counts as activity.
   */
  const isActivity: ActivityFilter = (event, deliberateOnly) => {
    if (!event.isTrusted) {
      return false
    }

    const now = performance.now()

    if (
      event instanceof PointerEvent &&
      event.type === ActivityEvent.PointerMove
    ) {
      const previous = lastPointer
      lastPointer = { x: event.screenX, y: event.screenY }
      /** True when the pointer was seen before and is now somewhere else. */
      const hasMoved =
        previous !== null &&
        (previous.x !== event.screenX || previous.y !== event.screenY)
      return hasMoved && !deliberateOnly
    }

    if (event.type === ActivityEvent.Scroll) {
      const isUserScroll = now - lastUserInputAt < userScrollWindowMs
      if (isUserScroll) {
        lastUserInputAt = now
      }
      return isUserScroll && !deliberateOnly
    }

    lastUserInputAt = now
    return event.type !== ActivityEvent.Wheel || !deliberateOnly
  }

  return isActivity
}
