import {
  clearExpiredSessionMarker,
  markExpiredSessionCleared,
  wasExpiredSessionCleared,
} from "./adminLoginStorage"
import { SessionRefusal } from "../types"

/** How the API last refused the session, while the message about it shows, or null. */
let sessionRefusal: SessionRefusal | null = null
/**
 * Grows each time the API refuses the session or the user signs in again,
 * so the answer to a request sent before either is ignored: a 401 to the
 * old token after signing in again, or a success that started before the
 * refusal and would otherwise close its message.
 */
let sessionGeneration = 0
/** Components subscribed to `sessionRefusal` through `useSyncExternalStore`. */
const sessionRefusalListeners = new Set<() => void>()

/**
 * Stores how the session was refused and notifies every subscriber.
 *
 * @param refusal - How the session was refused, or null when the message closes.
 */
function setSessionRefusal(refusal: SessionRefusal | null): void {
  if (sessionRefusal === refusal) {
    return
  }

  sessionRefusal = refusal
  sessionRefusalListeners.forEach((listener) => listener())
}

/**
 * Subscribes to the session being refused, accepted or the message closing.
 *
 * @param listener - Called whenever the refusal changes.
 * @returns A function that unsubscribes the listener.
 */
export function subscribeSessionRefusal(listener: () => void): () => void {
  sessionRefusalListeners.add(listener)
  return () => sessionRefusalListeners.delete(listener)
}

/**
 * Reads the refusal for `useSyncExternalStore`.
 *
 * @returns How the API refused the session, or null.
 */
export function getSessionRefusal(): SessionRefusal | null {
  return sessionRefusal
}

/**
 * Reads the session's generation for the session-aware base query.
 *
 * @returns How many times the session was refused or signed in again in this page.
 */
export function getSessionGeneration(): number {
  return sessionGeneration
}

/**
 * Records that the API refused the app's token. Right after signing in
 * again (`markExpiredSessionCleared`), it counts as refused again, so the
 * message shows an error instead of offering the same sign-in in a loop.
 * The session itself stays: only the user's choice clears it, because a
 * token renewal can be under way at the same time. Requests still under way
 * belong to the previous generation, so a success among them can't close
 * the message.
 */
export function reportSessionRefused(): void {
  sessionGeneration += 1
  setSessionRefusal(
    wasExpiredSessionCleared()
      ? SessionRefusal.RefusedAgain
      : SessionRefusal.Expired,
  )
}

/**
 * Records that the API accepted the session: forgets a sign-in again that
 * awaited it and closes the message.
 */
export function reportSessionAccepted(): void {
  clearExpiredSessionMarker()
  setSessionRefusal(null)
}

/**
 * Records that the user signed in again in a popup: the next answer of an
 * endpoint that needs a sign-in decides whether the API accepts it, and
 * the message closes meanwhile. Requests still under way with the old
 * token belong to the previous generation, so their 401 is ignored.
 */
export function reportSignedInAgain(): void {
  sessionGeneration += 1
  markExpiredSessionCleared()
  setSessionRefusal(null)
}

/** Closes the message without signing in again, so the page shows again. */
export function dismissSessionRefusal(): void {
  setSessionRefusal(null)
}
