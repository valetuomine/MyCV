import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useLocation } from "react-router-dom"
import { clearAuthReturnPaths } from "./adminLoginStorage"
import {
  isSignInConfigured,
  startSignInRedirect,
  useAuthSession,
} from "./authSession"
import {
  clearRedirectSignInError,
  getRedirectSignInError,
  isSignInCancelled,
  subscribeRedirectSignInError,
} from "./entraAuth"
import { getRetrySignInMethod } from "./signInLocationState"
import {
  cancelSignInPopup,
  openSignInPopup,
  prefersSignInPopup,
} from "./signInPopup"
import { SignInFailure, SignInMethod, SignInPopupOutcome } from "../types"

/** How long the sign-in message shows before the first redirect starts. */
const redirectHoldMs = 3500
/** How long after the redirect starts before it counts as slow. */
const slowRedirectMs = 5000

interface UseLoginRedirectOptions {
  enabled: boolean
  redirectPath: string
  storageKey: string
  storageValue: string
}

/**
 * Signs a signed-out user in with the method they choose. On devices with a
 * mouse or trackpad, the choice opens the provider's sign-in in a popup right
 * in the click, and the session updates in place when it succeeds. Cancel,
 * closing Google's window or the popup timeout returns to the choice as
 * cancelled, and leaving the screen cancels the popup. On touch devices, and
 * when the browser blocks the popup, it redirects instead: once MSAL is idle
 * it waits `redirectHoldMs` on the first attempt (not after a blocked popup),
 * stores where to return in session storage and starts the redirect. Both
 * ask for credentials or an account again after a sign-out. A callback's Try
 * again opens the route with the method in router state, which starts that
 * method's redirect at once, because it comes without a click. Signed-in
 * users and deployments without sign-in only get their stale return markers
 * cleared.
 *
 * Reports a cancelled or failed sign-in with the method it concerned, flags
 * a redirect that hasn't left after `slowRedirectMs`, and clears the
 * redirect error on unmount.
 *
 * @param props - The redirect options.
 * @param props.enabled - Whether this route needs sign-in now.
 * @param props.redirectPath - The path Microsoft returns the browser to.
 * @param props.storageKey - The session-storage key for the return marker.
 * @param props.storageValue - The return marker the callback route reads.
 * @returns The chosen, popup, cancelled and failed methods, the failure,
 *   whether MSAL is busy or the redirect slow, and the actions that start,
 *   cancel, retry or reset sign-in.
 */
export default function useLoginRedirect({
  enabled,
  redirectPath,
  storageKey,
  storageValue,
}: UseLoginRedirectOptions): {
  pendingMethod: SignInMethod | null
  popupMethod: SignInMethod | null
  cancelledMethod: SignInMethod | null
  failedMethod: SignInMethod | null
  signInFailure: SignInFailure | null
  isBusy: boolean
  isRedirectSlow: boolean
  startSignIn: (method: SignInMethod) => void
  cancelSignIn: () => void
  retrySignIn: () => void
  chooseAnotherMethod: () => void
} {
  const { isSignedIn, isBusy } = useAuthSession()
  const location = useLocation()
  const redirectStarted = useRef(false)
  /** The method a callback's Try again asked to retry, read once on mount. */
  const [retryMethod] = useState(() => getRetrySignInMethod(location.state))
  const [pendingMethod, setPendingMethod] = useState<SignInMethod | null>(
    retryMethod,
  )
  const [popupMethod, setPopupMethod] = useState<SignInMethod | null>(null)
  const [cancelledMethod, setCancelledMethod] = useState<SignInMethod | null>(
    null,
  )
  const [popupFailedMethod, setPopupFailedMethod] =
    useState<SignInMethod | null>(null)
  const [attempt, setAttempt] = useState(retryMethod ? 1 : 0)
  const [startError, setStartError] = useState<unknown>(null)
  const [isRedirectSlow, setIsRedirectSlow] = useState(false)
  const redirectError = useSyncExternalStore(
    subscribeRedirectSignInError,
    getRedirectSignInError,
  )

  const failureError = redirectError ?? startError
  /** Whether sign-in was cancelled or failed, or null while it hasn't. */
  const signInFailure: SignInFailure | null = failureError
    ? isSignInCancelled(failureError)
      ? SignInFailure.Cancelled
      : SignInFailure.Failed
    : popupFailedMethod
      ? SignInFailure.Failed
      : null
  /** The method that failed: Microsoft for an MSAL redirect error, otherwise the chosen one. */
  const failedMethod = redirectError
    ? SignInMethod.Microsoft
    : startError
      ? pendingMethod
      : popupFailedMethod

  useEffect(() => {
    if (!enabled || isBusy) {
      return
    }

    if (isSignedIn || !isSignInConfigured) {
      clearAuthReturnPaths()
      return
    }

    if (!pendingMethod || failureError || redirectStarted.current) {
      return
    }

    redirectStarted.current = true
    let redirectFired = false
    const timeout = setTimeout(
      () => {
        redirectFired = true
        sessionStorage.setItem(storageKey, storageValue)
        startSignInRedirect(pendingMethod, redirectPath).catch(
          (error: unknown) => {
            redirectStarted.current = false
            clearAuthReturnPaths()
            setStartError(error ?? new Error("Sign-in could not be started."))
          },
        )
      },
      attempt === 0 ? redirectHoldMs : 0,
    )

    return () => {
      if (!redirectFired) {
        clearTimeout(timeout)
        redirectStarted.current = false
      }
    }
  }, [
    attempt,
    enabled,
    failureError,
    isBusy,
    isSignedIn,
    pendingMethod,
    redirectPath,
    storageKey,
    storageValue,
  ])

  useEffect(() => {
    if (!enabled || !pendingMethod || isSignedIn || signInFailure) {
      return
    }

    const timeout = setTimeout(
      () => setIsRedirectSlow(true),
      (attempt === 0 ? redirectHoldMs : 0) + slowRedirectMs,
    )
    return () => clearTimeout(timeout)
  }, [attempt, enabled, isSignedIn, pendingMethod, signInFailure])

  useEffect(() => clearRedirectSignInError, [])

  useEffect(() => cancelSignInPopup, [])

  /** Clears the failure, the cancel notice and the slow flag, so a new attempt can start. */
  const resetAttempt = (): void => {
    redirectStarted.current = false
    clearRedirectSignInError()
    setStartError(null)
    setPopupFailedMethod(null)
    setCancelledMethod(null)
    setIsRedirectSlow(false)
  }

  /**
   * Opens the method's popup and shows how it ended: back to the choice
   * when cancelled, the failure message when it failed, and the redirect,
   * without the hold, when the browser blocked the window. Success needs
   * nothing here, because the session updates and the route moves on.
   *
   * @param method - The sign-in method.
   */
  const startPopup = (method: SignInMethod): void => {
    setPendingMethod(null)
    setPopupMethod(method)
    void openSignInPopup(method).then((outcome) => {
      setPopupMethod(null)
      if (outcome === SignInPopupOutcome.Blocked) {
        setAttempt((current) => current + 1)
        setPendingMethod(method)
      } else if (outcome === SignInPopupOutcome.Cancelled) {
        setCancelledMethod(method)
      } else if (outcome === SignInPopupOutcome.Failed) {
        setPopupFailedMethod(method)
      }
    })
  }

  /**
   * Starts sign-in with the chosen method: the popup at once, or on touch
   * devices the redirect after the hold message.
   *
   * @param method - The method the user chose.
   */
  const startSignIn = (method: SignInMethod): void => {
    resetAttempt()
    if (prefersSignInPopup()) {
      startPopup(method)
    } else {
      setPendingMethod(method)
    }
  }

  /** Starts the method that failed again: the popup, or the redirect without the hold. */
  const retrySignIn = (): void => {
    const method = failedMethod ?? pendingMethod
    resetAttempt()
    if (method && prefersSignInPopup()) {
      startPopup(method)
      return
    }

    setAttempt((current) => current + 1)
    setPendingMethod(method)
  }

  /** Clears the failure and shows the sign-in choice again. */
  const chooseAnotherMethod = (): void => {
    resetAttempt()
    setPendingMethod(null)
  }

  return {
    pendingMethod,
    popupMethod,
    cancelledMethod,
    failedMethod,
    signInFailure,
    isBusy,
    isRedirectSlow: isRedirectSlow && !signInFailure,
    startSignIn,
    cancelSignIn: cancelSignInPopup,
    retrySignIn,
    chooseAnotherMethod,
  }
}
