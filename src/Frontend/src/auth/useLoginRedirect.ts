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
import { SignInFailure, SignInMethod } from "../types"

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
 * Sends a signed-out user to the sign-in method they choose. After
 * `startSignIn`, and once MSAL is idle, it waits `redirectHoldMs` on the
 * first attempt, stores where to return in session storage and starts the
 * redirect, which asks for credentials or an account again after a sign-out.
 * A callback's Try again opens the route with the method in router state,
 * which starts that method again at once. Signed-in users and deployments
 * without sign-in only get their stale return markers cleared.
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
 * @returns The chosen and failed methods, the failure, whether MSAL is busy
 *   or the redirect slow, and the actions that start, retry or reset sign-in.
 */
export default function useLoginRedirect({
  enabled,
  redirectPath,
  storageKey,
  storageValue,
}: UseLoginRedirectOptions): {
  pendingMethod: SignInMethod | null
  failedMethod: SignInMethod | null
  signInFailure: SignInFailure | null
  isBusy: boolean
  isRedirectSlow: boolean
  startSignIn: (method: SignInMethod) => void
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
    : null
  /** The method that failed: Microsoft for an MSAL redirect error, otherwise the chosen one. */
  const failedMethod = redirectError
    ? SignInMethod.Microsoft
    : startError
      ? pendingMethod
      : null

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

  /** Clears the failure and the slow flag, so a new attempt can start. */
  const resetAttempt = (): void => {
    redirectStarted.current = false
    clearRedirectSignInError()
    setStartError(null)
    setIsRedirectSlow(false)
  }

  /**
   * Starts sign-in with the chosen method, after the hold message.
   *
   * @param method - The sign-in method the user chose.
   */
  const startSignIn = (method: SignInMethod): void => {
    resetAttempt()
    setPendingMethod(method)
  }

  /** Starts the method that failed again, redirecting immediately. */
  const retrySignIn = (): void => {
    const method = failedMethod ?? pendingMethod
    resetAttempt()
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
    failedMethod,
    signInFailure,
    isBusy,
    isRedirectSlow: isRedirectSlow && !signInFailure,
    startSignIn,
    retrySignIn,
    chooseAnotherMethod,
  }
}
