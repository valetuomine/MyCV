import { InteractionStatus } from "@azure/msal-browser"
import { useMsal } from "@azure/msal-react"
import { useEffect, useRef, useState } from "react"
import { clearLoginReturnPaths } from "./adminLoginStorage"
import { apiScope, isEntraConfigured, redirectUri } from "./entraAuth"

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
  signInError: boolean
  retrySignIn: () => void
} {
  const { accounts, inProgress, instance } = useMsal()
  const redirectStarted = useRef(false)
  const [attempt, setAttempt] = useState(0)
  const [signInError, setSignInError] = useState(false)

  useEffect(() => {
    if (!enabled || inProgress !== InteractionStatus.None) {
      return
    }

    if (accounts[0] || !isEntraConfigured) {
      clearLoginReturnPaths()
      return
    }

    if (redirectStarted.current) {
      return
    }

    redirectStarted.current = true
    setSignInError(false)
    sessionStorage.setItem(storageKey, storageValue)
    void instance
      .loginRedirect({
        scopes: [apiScope],
        redirectUri,
        redirectStartPage: `${window.location.origin}${redirectPath}`,
      })
      .catch(() => {
        redirectStarted.current = false
        clearLoginReturnPaths()
        setSignInError(true)
      })
  }, [
    accounts,
    attempt,
    enabled,
    inProgress,
    instance,
    redirectPath,
    storageKey,
    storageValue,
  ])

  const retrySignIn = () => {
    redirectStarted.current = false
    setSignInError(false)
    setAttempt((current) => current + 1)
  }

  return { signInError, retrySignIn }
}
