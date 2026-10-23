import { useState, type JSX } from "react"
import { matchPath, Navigate } from "react-router-dom"
import { useAuthSession } from "../authSession"
import { completeGoogleSignIn } from "../googleAuth"
import SignInCallback from "../SignInCallback"
import { RoutePaths } from "../../routePaths"
import { SignInMethod } from "../../types"

/**
 * Finds the sign-in route for the page a silent renewal started on.
 *
 * @param path - The page the renewal started on.
 * @returns The page's sign-in route, or Home when it has none.
 */
function signInPathFor(path: string | null): string {
  if (!path) {
    return RoutePaths.Home
  }

  if (path === RoutePaths.AdminCreateProfile) {
    return RoutePaths.AdminCreateProfile
  }

  /** The CV the page belongs to, whether it was viewed or being signed in to. */
  const publicUrlSegment = (
    matchPath(RoutePaths.CandidateAdminPattern, path) ??
    matchPath(RoutePaths.CandidateProfilePattern, path)
  )?.params.publicUrlSegment

  return publicUrlSegment
    ? RoutePaths.CandidateAdmin(publicUrlSegment)
    : RoutePaths.Home
}

/**
 * The `/auth/callback/google` route that Google redirects back to. It reads
 * the result of the Google sign-in, which `googleAuth.ts` completes before
 * React renders, then `SignInCallback` sends the user on, or
 * back to the page a silent renewal started on. When a silent renewal needs
 * the user, it opens that page's sign-in route instead.
 *
 * @returns The callback screen, or a redirect to the sign-in route.
 */
export default function GoogleAuthCallbackRoute(): JSX.Element {
  const [result] = useState(completeGoogleSignIn)
  const { isSignedIn, isBusy } = useAuthSession()

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
