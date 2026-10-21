import { InteractionStatus, PromptValue } from "@azure/msal-browser"
import { useMsal } from "@azure/msal-react"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import {
  clearAuthReturnPaths,
  isSignInPromptRequired,
} from "./adminLoginStorage"
import {
  apiScope,
  clearRedirectSignInError,
  getRedirectSignInError,
  isEntraConfigured,
  isSignInCancelled,
  redirectUri,
  subscribeRedirectSignInError,
} from "./entraAuth"
import { SignInFailure } from "../types"

/** How long the sign-in message shows before the first redirect starts. */
const redirectHoldMs = 3500
/** How long after the redirect starts before it counts as slow. */
const slowRedirectMs = 5000

interface UseEntraLoginRedirectOptions {
  enabled: boolean
  redirectPath: string
  storageKey: string
  storageValue: string
}

/**
 * Sends a signed-out user to Microsoft sign-in. Once MSAL is idle, it waits
 * `redirectHoldMs` on the first attempt, stores where to return in session
 * storage and starts the login redirect, which asks for credentials again
 * after a sign-out. Signed-in users and deployments
 * without sign-in only get their stale return markers cleared.
 *
 * Reports a cancelled or failed sign-in, flags a redirect that hasn't left
 * after `slowRedirectMs`, and clears the redirect error on unmount.
 *
 * @param props - The redirect options.
 * @param props.enabled - Whether this route needs sign-in now.
 * @param props.redirectPath - The path Microsoft returns the browser to.
 * @param props.storageKey - The session-storage key for the return marker.
 * @param props.storageValue - The return marker the callback route reads.
 * @returns The sign-in failure, whether the redirect is slow, and a retry.
 */
export default function useEntraLoginRedirect({
  enabled,
  redirectPath,
  storageKey,
  storageValue,
}: UseEntraLoginRedirectOptions): {
  signInFailure: SignInFailure | null
  isRedirectSlow: boolean
  retrySignIn: () => void
} {
  const { accounts, inProgress, instance } = useMsal()
  const redirectStarted = useRef(false)
  const [attempt, setAttempt] = useState(0)
  const [startError, setStartError] = useState<unknown>(null)
  const [isRedirectSlow, setIsRedirectSlow] = useState(false)
  const redirectError = useSyncExternalStore(
    subscribeRedirectSignInError,
    getRedirectSignInError,
  )
  const hasAccount = Boolean(accounts[0])

  const failureError = redirectError ?? startError
  /** Whether sign-in was cancelled or failed, or null while it hasn't. */
  const signInFailure: SignInFailure | null = failureError
    ? isSignInCancelled(failureError)
      ? SignInFailure.Cancelled
      : SignInFailure.Failed
    : null

  useEffect(() => {
    if (!enabled || inProgress !== InteractionStatus.None) {
      return
    }

    if (accounts[0] || !isEntraConfigured) {
      clearAuthReturnPaths()
      return
    }

    if (redirectError || redirectStarted.current) {
      return
    }

    redirectStarted.current = true
    let redirectFired = false
    const timeout = setTimeout(
      () => {
        redirectFired = true
        sessionStorage.setItem(storageKey, storageValue)
        void instance
          .loginRedirect({
            scopes: [apiScope],
            redirectUri,
            redirectStartPage: `${window.location.origin}${redirectPath}`,
            prompt: isSignInPromptRequired() ? PromptValue.LOGIN : undefined,
          })
          .catch((error: unknown) => {
            redirectStarted.current = false
            clearAuthReturnPaths()
            setStartError(error ?? new Error("Sign-in could not be started."))
          })
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
    accounts,
    attempt,
    enabled,
    inProgress,
    instance,
    redirectError,
    redirectPath,
    storageKey,
    storageValue,
  ])

  useEffect(() => {
    if (!enabled || !isEntraConfigured || hasAccount || signInFailure) {
      return
    }

    const timeout = setTimeout(
      () => setIsRedirectSlow(true),
      (attempt === 0 ? redirectHoldMs : 0) + slowRedirectMs,
    )
    return () => clearTimeout(timeout)
  }, [attempt, enabled, hasAccount, signInFailure])

  useEffect(() => clearRedirectSignInError, [])

  /** Clears the failure and starts a new attempt that redirects immediately. */
  const retrySignIn = () => {
    redirectStarted.current = false
    clearRedirectSignInError()
    setStartError(null)
    setIsRedirectSlow(false)
    setAttempt((current) => current + 1)
  }

  return {
    signInFailure,
    isRedirectSlow: isRedirectSlow && !signInFailure,
    retrySignIn,
  }
}
