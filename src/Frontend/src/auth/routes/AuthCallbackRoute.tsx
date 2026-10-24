import { useState, useSyncExternalStore, type JSX } from "react"
import { readLinkSignInMarker } from "../adminLoginStorage"
import { useAuthSession } from "../authSession"
import {
  clearRedirectSignInError,
  getLinkRedirectResult,
  getRedirectSignInError,
  isSignInCancelled,
  subscribeRedirectSignInError,
} from "../entraAuth"
import LinkSignInCallback from "../LinkSignInCallback"
import SignInCallback from "../SignInCallback"
import { SignInFailure, SignInMethod } from "../../types"

/**
 * The `/auth/callback` route that Microsoft redirects back to. A linking
 * marker means a Microsoft account is being added to the CV, and
 * `LinkSignInCallback` finishes that. Otherwise, once MSAL has handled the
 * response, `SignInCallback` sends the user on, or explains a failed or
 * cancelled sign-in.
 *
 * @returns The callback screen.
 */
export default function AuthCallbackRoute(): JSX.Element {
  const { isSignedIn, isBusy } = useAuthSession()
  const redirectError = useSyncExternalStore(
    subscribeRedirectSignInError,
    getRedirectSignInError,
  )
  /** The linking marker, read once before the callback clears it. */
  const [linkMarker] = useState(readLinkSignInMarker)
  /** Whether sign-in was cancelled or failed, or null while it hasn't. */
  const signInFailure = redirectError
    ? isSignInCancelled(redirectError)
      ? SignInFailure.Cancelled
      : SignInFailure.Failed
    : null

  if (linkMarker?.method === SignInMethod.Microsoft) {
    /** The added account's result, available once MSAL is idle. */
    const linkResult = isBusy ? null : getLinkRedirectResult()

    return (
      <LinkSignInCallback
        method={SignInMethod.Microsoft}
        marker={linkMarker}
        isReady={!isBusy}
        linkToken={linkResult?.accessToken ?? null}
        linkedAccount={linkResult?.account ?? null}
        failure={signInFailure}
        onLeave={clearRedirectSignInError}
      />
    )
  }

  return (
    <SignInCallback
      method={SignInMethod.Microsoft}
      isReady={!isBusy}
      isSignedIn={isSignedIn}
      signInFailure={signInFailure}
      onLeave={clearRedirectSignInError}
    />
  )
}
