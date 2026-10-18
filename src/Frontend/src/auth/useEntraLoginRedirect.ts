import { InteractionStatus } from "@azure/msal-browser"
import { useMsal } from "@azure/msal-react"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { clearAuthReturnPaths } from "./adminLoginStorage"
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

const redirectHoldMs = 2000
const slowRedirectMs = 5000

interface UseEntraLoginRedirectOptions {
  enabled: boolean
  redirectPath: string
  storageKey: string
  storageValue: string
}

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
