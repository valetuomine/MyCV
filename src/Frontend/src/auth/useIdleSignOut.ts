import { useMsal } from "@azure/msal-react"
import { useEffect, useRef } from "react"
import { storeSignOutReturn } from "./adminLoginStorage"
import { isEntraConfigured } from "./entraAuth"
import useSignOutReturnSegment from "./useSignOutReturnSegment"
import { RoutePaths } from "../routePaths"
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
 * Signs the user out after `idleTimeoutMs` without activity. The sign-out
 * only clears MSAL's cache, so Microsoft's logout page never shows, and then
 * reloads Home, which returns to the CV on screen with the idle notice like
 * a manual sign-out does.
 *
 * Time is measured from the last activity rather than with one long timer,
 * so a tab that was hidden or a device that slept is signed out as soon as
 * it is checked again: on the next interval, on returning to the tab, or on
 * the first activity.
 */
export default function useIdleSignOut(): void {
  const { accounts, instance } = useMsal()
  const publicUrlSegment = useSignOutReturnSegment()
  const returnSegment = useRef(publicUrlSegment)
  const isSignedIn = accounts.length > 0

  useEffect(() => {
    returnSegment.current = publicUrlSegment
  }, [publicUrlSegment])

  useEffect(() => {
    if (!isSignedIn || !isEntraConfigured) {
      return
    }

    let lastActivity = Date.now()
    let isSigningOut = false

    /**
     * Clears the signed-in account and reloads Home with the idle sign-out
     * markers. If the cache can't be cleared, the user stays signed in and
     * the next check tries again.
     */
    const signOut = async (): Promise<void> => {
      isSigningOut = true
      try {
        await instance.clearCache()
      } catch {
        isSigningOut = false
        return
      }

      storeSignOutReturn(returnSegment.current, SignOutReason.Idle)
      window.location.replace(RoutePaths.Home)
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
  }, [instance, isSignedIn])
}
