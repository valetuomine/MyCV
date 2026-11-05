import { useCallback, useEffect, useRef, useState } from "react"
import { signOutInApp, useAuthSession } from "./authSession"
import { createActivityFilter } from "./idleActivity"
import useSignOutReturnSegment from "./useSignOutReturnSegment"
import { ActivityEvent, IdleMessageType, SignOutReason } from "../types"

/** How long the app may go unused before the user is signed out. */
const idleTimeoutMs = 5 * 60 * 1000
/** How long before the sign-out the warning shows. */
const warningMs = 60 * 1000
/** The longest wait between two checks before the warning is due. */
const idleCheckIntervalMs = 10 * 1000
/** How long a failed sign-out waits before the next attempt. */
const signOutRetryMs = 10 * 1000
/** The channel that keeps the idle time and the idle sign-out the same in every tab of the app. */
const idleChannelName = "mycv-idle-session"
/** The local storage key of the last activity shared by the app's tabs, which a waking tab reads before it decides. */
const lastActivityKey = "mycv-idle-last-activity"
/** The least time between two shares of the activity with the other tabs. */
const activityShareIntervalMs = 2000

/** A message between the app's tabs about the idle session, with the sender's last activity. */
interface IdleMessage {
  type: IdleMessageType
  at: number
}

/** The idle warning's state for the component that shows it. */
interface IdleSignOutState {
  secondsLeft: number | null
  continueSession: () => void
}

/**
 * Tells whether a message from another tab is an idle-session message.
 *
 * @param data - The message data.
 * @returns True when the data is an `IdleMessage`.
 */
function isIdleMessage(data: unknown): data is IdleMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    Object.values<unknown>(IdleMessageType).includes(data.type) &&
    "at" in data &&
    typeof data.at === "number"
  )
}

/**
 * Reads the last activity that the app's tabs share.
 *
 * @returns The time of the last shared activity, or 0 when none is stored or storage is blocked.
 */
function readSharedActivity(): number {
  try {
    return Number(localStorage.getItem(lastActivityKey)) || 0
  } catch {
    return 0
  }
}

/**
 * Stores the last activity for the app's other tabs. Blocked storage leaves
 * the tabs to the channel's messages.
 *
 * @param at - The time of the last activity.
 */
function storeSharedActivity(at: number): void {
  try {
    localStorage.setItem(lastActivityKey, String(at))
  } catch {
    return
  }
}

/**
 * Signs the user out after `idleTimeoutMs` without activity, in the app like
 * the sign-out button, and with the idle notice. For the last `warningMs`
 * it returns the seconds left, so a warning can offer to continue the
 * session. Only the user's own input counts (`createActivityFilter`), and
 * while the warning shows only a press, a tap, a key or `continueSession`
 * continues it, not a pointer that merely moves.
 *
 * Time is measured from the last activity rather than with one long timer,
 * so a tab that was hidden or a device that slept is signed out as soon as
 * it is checked again: on the next check, on returning to the tab, or on
 * the first activity. Checks come at most `idleCheckIntervalMs` apart, at
 * the moment the warning is due, and then every time the countdown's
 * second changes.
 *
 * The app's signed-in tabs share the last activity, so using one tab keeps
 * the others signed in and the idle sign-out happens in all of them. A
 * `BroadcastChannel` carries it at once, at most every
 * `activityShareIntervalMs` with the latest one always sent last, and at
 * once while the warning shows, so continuing in one tab hides the warning
 * in all of them. Local storage keeps it too, because a tab the browser
 * froze or put to sleep can wake before the channel's queued messages
 * arrive, and every check reads it first. Signing in or loading the page
 * counts as activity and is shared at once. The idle sign-out message
 * carries the sender's last activity, and a tab with newer activity ignores
 * it. A user's own sign-out stays in its tab.
 *
 * @returns The seconds left while the warning should show, otherwise null, and a function that continues the session.
 */
export default function useIdleSignOut(): IdleSignOutState {
  const { isSignedIn } = useAuthSession()
  const publicUrlSegment = useSignOutReturnSegment()
  const returnSegment = useRef(publicUrlSegment)
  const continueSessionRef = useRef<() => void>(() => undefined)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  useEffect(() => {
    returnSegment.current = publicUrlSegment
  }, [publicUrlSegment])

  useEffect(() => {
    if (!isSignedIn) {
      return
    }

    let lastActivity = Date.now()
    let isSigningOut = false
    let lastSharedAt = 0
    let pendingShare: ReturnType<typeof setTimeout> | undefined
    let nextCheck: ReturnType<typeof setTimeout> | undefined
    const isActivity = createActivityFilter()
    /** The channel to the app's other tabs, or null in a browser without `BroadcastChannel`. */
    const channel =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel(idleChannelName)

    /** Takes in newer activity from the value the other tabs share. */
    const takeSharedActivity = (): void => {
      lastActivity = Math.max(
        lastActivity,
        Math.min(readSharedActivity(), Date.now()),
      )
    }

    /**
     * Tells how long is left before the sign-out, after taking in the other
     * tabs' newer activity.
     *
     * @returns The time left in milliseconds, zero or less once it has run out.
     */
    const timeLeft = (): number => {
      takeSharedActivity()
      return lastActivity + idleTimeoutMs - Date.now()
    }

    /**
     * Sends a message to the other tabs with this tab's last activity.
     *
     * @param type - Whether it shares the activity or signs the tabs out.
     */
    const postMessage = (type: IdleMessageType): void => {
      channel?.postMessage({ type, at: lastActivity } satisfies IdleMessage)
    }

    /** Shares the last activity with the other tabs. */
    const sendActivity = (): void => {
      pendingShare = undefined
      lastSharedAt = Date.now()
      storeSharedActivity(lastActivity)
      postMessage(IdleMessageType.Activity)
    }

    /**
     * Shares the last activity with the other tabs, at once or after the
     * rest of `activityShareIntervalMs`.
     *
     * @param immediately - Whether to send it now, as when the warning shows.
     */
    const shareActivity = (immediately: boolean): void => {
      /** How long until the next share is allowed; zero or less sends now. */
      const wait = immediately
        ? 0
        : lastSharedAt + activityShareIntervalMs - Date.now()
      if (wait <= 0) {
        clearTimeout(pendingShare)
        sendActivity()
      } else if (pendingShare === undefined) {
        pendingShare = setTimeout(sendActivity, wait)
      }
    }

    /**
     * Signs out for being idle and hides the warning. If the sign-out fails,
     * the user stays signed in and the check tries again after
     * `signOutRetryMs`.
     *
     * @param isShared - Whether to sign the other tabs out too, false when another tab asked for it.
     */
    const signOut = async (isShared: boolean): Promise<void> => {
      isSigningOut = true
      clearTimeout(nextCheck)
      setSecondsLeft(null)
      if (isShared) {
        postMessage(IdleMessageType.SignOut)
      }

      try {
        await signOutInApp(returnSegment.current, SignOutReason.Idle)
      } catch {
        isSigningOut = false
        nextCheck = setTimeout(check, signOutRetryMs)
      }
    }

    /**
     * Signs the user out once the idle time has run out. Otherwise updates
     * the countdown, which is null until the warning is due, and schedules
     * the next check: when the warning is due or after
     * `idleCheckIntervalMs`, and during the warning when the countdown's
     * second changes.
     */
    const check = (): void => {
      clearTimeout(nextCheck)
      if (isSigningOut) {
        return
      }

      const left = timeLeft()
      if (left <= 0) {
        void signOut(true)
        return
      }

      /** The whole seconds the countdown shows, rounded up. */
      const seconds = Math.ceil(left / 1000)
      setSecondsLeft(left <= warningMs ? seconds : null)
      nextCheck = setTimeout(
        check,
        left > warningMs
          ? Math.min(left - warningMs, idleCheckIntervalMs)
          : left - (seconds - 1) * 1000,
      )
    }

    /**
     * Restarts the idle time, shares it with the other tabs at once and
     * hides the warning, unless the idle time has already run out.
     */
    const continueSession = (): void => {
      if (!isSigningOut && timeLeft() > 0) {
        lastActivity = Date.now()
        shareActivity(true)
      }
      check()
    }

    /**
     * Restarts the idle time on the user's own input, unless it had already
     * run out while the page was hidden or the device slept. While the
     * warning shows, only a press, a tap or a key counts.
     *
     * @param event - The input event.
     */
    const handleActivity = (event: Event): void => {
      if (isSigningOut) {
        return
      }

      const isWarning = timeLeft() <= warningMs
      if (!isActivity(event, isWarning)) {
        return
      }

      if (isWarning) {
        continueSession()
        return
      }

      lastActivity = Date.now()
      shareActivity(false)
    }

    /**
     * Follows the other tabs: newer activity restarts the idle time here
     * too, and their idle sign-out signs this tab out, unless this tab was
     * used after the sender's last activity.
     *
     * @param event - The message from another tab.
     */
    const handleMessage = (event: MessageEvent<unknown>): void => {
      if (!isIdleMessage(event.data) || isSigningOut) {
        return
      }

      takeSharedActivity()
      if (event.data.type === IdleMessageType.SignOut) {
        if (event.data.at >= lastActivity) {
          void signOut(false)
        }
      } else if (event.data.at > lastActivity) {
        lastActivity = Math.min(event.data.at, Date.now())
        check()
      }
    }

    /** Checks the idle time when the tab comes back into view. */
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "visible") {
        check()
      }
    }

    continueSessionRef.current = continueSession
    const listenerOptions = { capture: true, passive: true }
    Object.values(ActivityEvent).forEach((eventName) =>
      window.addEventListener(eventName, handleActivity, listenerOptions),
    )
    document.addEventListener("visibilitychange", handleVisibilityChange)
    channel?.addEventListener("message", handleMessage)
    shareActivity(true)
    nextCheck = setTimeout(check, idleCheckIntervalMs)

    return () => {
      Object.values(ActivityEvent).forEach((eventName) =>
        window.removeEventListener(eventName, handleActivity, listenerOptions),
      )
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      channel?.removeEventListener("message", handleMessage)
      channel?.close()
      clearTimeout(nextCheck)
      clearTimeout(pendingShare)
      continueSessionRef.current = () => undefined
      setSecondsLeft(null)
    }
  }, [isSignedIn])

  /** Continues the session from the warning's button, including a screen reader's click that sends no press or key. */
  const continueSession = useCallback(() => continueSessionRef.current(), [])

  return { secondsLeft: isSignedIn ? secondsLeft : null, continueSession }
}
