import { useEffect, useRef } from "react"
import { signOutInApp, useAuthSession } from "./authSession"
import useSignOutReturnSegment from "./useSignOutReturnSegment"
import { SignOutReason } from "../types"

/** How long the app may go unused before the user is signed out. */
const idleTimeoutMs = 5 * 60 * 1000
/** How often the idle time is checked while the page stays untouched. */
const idleCheckIntervalMs = 10 * 1000
/** The events that count as using the app. */
const activityEvents = [
  "pointerdown",
  "pointermove",
  "keydown",
  "wheel",
  "scroll",
  "touchstart",
] as const

/**
 * Signs the user out after `idleTimeoutMs` without activity, in the app like
 * the sign-out button, and with the idle notice.
 *
 * Time is measured from the last activity rather than with one long timer,
 * so a tab that was hidden or a device that slept is signed out as soon as
 * it is checked again: on the next interval, on returning to the tab, or on
 * the first activity.
 */
export default function useIdleSignOut(): void {
  const { isSignedIn } = useAuthSession()
  const publicUrlSegment = useSignOutReturnSegment()
  const returnSegment = useRef(publicUrlSegment)

  useEffect(() => {
    returnSegment.current = publicUrlSegment
  }, [publicUrlSegment])

  useEffect(() => {
    if (!isSignedIn) {
      return
    }

    let lastActivity = Date.now()
    let isSigningOut = false

    /**
     * Signs out for being idle. If the sign-out fails, the user stays signed
     * in and the next check tries again.
     */
    const signOut = async (): Promise<void> => {
      isSigningOut = true
      try {
        await signOutInApp(returnSegment.current, SignOutReason.Idle)
      } catch {
        isSigningOut = false
      }
    }

    /**
     * Signs the user out once the idle time has run out.
     *
     * @returns True when the sign-out started.
     */
    const signOutIfIdle = (): boolean => {
      if (isSigningOut || Date.now() - lastActivity < idleTimeoutMs) {
        return isSigningOut
      }

      void signOut()
      return true
    }

    /**
     * Restarts the idle time, unless it had already run out while the page
     * was hidden or the device slept.
     */
    const recordActivity = (): void => {
      if (!signOutIfIdle()) {
        lastActivity = Date.now()
      }
    }

    /** Checks the idle time when the tab comes back into view. */
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "visible") {
        signOutIfIdle()
      }
    }

    const listenerOptions = { capture: true, passive: true }
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, recordActivity, listenerOptions),
    )
    document.addEventListener("visibilitychange", handleVisibilityChange)
    const interval = setInterval(signOutIfIdle, idleCheckIntervalMs)

    return () => {
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, recordActivity, listenerOptions),
      )
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      clearInterval(interval)
    }
  }, [isSignedIn])
}
