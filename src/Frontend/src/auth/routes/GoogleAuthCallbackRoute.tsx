import { useState, type JSX } from "react"
import { Navigate } from "react-router-dom"
import { readLinkSignInMarker } from "../adminLoginStorage"
import { useAuthSession } from "../authSession"
import { completeGoogleSignIn } from "../googleAuth"
import LinkSignInCallback from "../LinkSignInCallback"
import SignInCallback from "../SignInCallback"
import { signInPathFor } from "../signInPath"
import { SignInMethod } from "../../types"

/**
 * The `/auth/callback/google` route that Google redirects back to. It reads
 * the result of the Google sign-in, which `googleAuth.ts` completes before
 * React renders. A sign-in that adds Google to the CV goes to
 * `LinkSignInCallback`. Otherwise `SignInCallback` sends the user on, or
 * back to the page a silent renewal started on. When a silent renewal needs
 * the user, it opens that page's sign-in route instead.
 *
 * @returns The callback screen, or a redirect to the sign-in route.
 */
export default function GoogleAuthCallbackRoute(): JSX.Element {
  const [result] = useState(completeGoogleSignIn)
  /** The linking marker, read once before the callback clears it. */
  const [linkMarker] = useState(readLinkSignInMarker)
  const { isSignedIn, isBusy } = useAuthSession()

  if (result.isLink) {
    return (
      <LinkSignInCallback
        method={SignInMethod.Google}
        marker={linkMarker?.method === SignInMethod.Google ? linkMarker : null}
        isReady={!isBusy}
        linkToken={result.linkToken}
        failure={result.failure}
      />
    )
  }

  if (result.isSignInRequired) {
    return <Navigate to={signInPathFor(result.returnPath)} replace />
  }

  return (
    <SignInCallback
      method={SignInMethod.Google}
      isReady={!isBusy}
      isSignedIn={isSignedIn}
      signInFailure={result.failure}
      destination={result.silent ? result.returnPath : null}
    />
  )
}
