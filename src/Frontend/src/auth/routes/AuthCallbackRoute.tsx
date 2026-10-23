import { useSyncExternalStore, type JSX } from "react"
import { useAuthSession } from "../authSession"
import {
  clearRedirectSignInError,
  getRedirectSignInError,
  isSignInCancelled,
  subscribeRedirectSignInError,
} from "../entraAuth"
import SignInCallback from "../SignInCallback"
import { SignInFailure, SignInMethod } from "../../types"

/**
 * The `/auth/callback` route that Microsoft redirects back to. Once MSAL has
 * handled the response, `SignInCallback` sends the user on, or explains a
 * failed or cancelled sign-in.
 *
 * @returns The callback screen.
 */
export default function AuthCallbackRoute(): JSX.Element {
  const { isSignedIn, isBusy } = useAuthSession()
  const redirectError = useSyncExternalStore(
    subscribeRedirectSignInError,
    getRedirectSignInError,
  )

  return (
    <SignInCallback
      method={SignInMethod.Microsoft}
      isReady={!isBusy}
      isSignedIn={isSignedIn}
      signInFailure={
        redirectError
          ? isSignInCancelled(redirectError)
            ? SignInFailure.Cancelled
            : SignInFailure.Failed
          : null
      }
      onLeave={clearRedirectSignInError}
    />
  )
}
