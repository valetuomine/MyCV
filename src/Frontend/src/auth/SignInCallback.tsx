import { useEffect, useRef, useState, type JSX } from "react"
import { useNavigate } from "react-router-dom"
import {
  clearAuthReturnPaths,
  returnAdminPathKey,
  returnPublicUrlSegmentKey,
} from "./adminLoginStorage"
import { signInMethodNames } from "./authSession"
import { retrySignInLocationState } from "./signInLocationState"
import RouteMessage from "../pages/Profile/components/RouteMessage"
import {
  primaryButton,
  secondaryButton,
} from "../pages/components/buttonStyles"
import { RoutePaths } from "../routePaths"
import { SignInFailure, Tone, type SignInMethod } from "../types"

interface SignInCallbackProps {
  method: SignInMethod
  isReady: boolean
  isSignedIn: boolean
  signInFailure: SignInFailure | null
  destination?: string | null
  onLeave?: () => void
}

/**
 * The screen of a sign-in callback route, shared by Microsoft and Google.
 * Once the provider's response is handled, it clears the return markers and
 * sends the user on: to the given destination, to profile creation or the CV
 * they came from when signed in, otherwise Home. A failed or cancelled
 * sign-in shows a message naming the provider, with a Try again that starts
 * the same method on the sign-in route.
 *
 * @param props - The component props.
 * @param props.method - The provider the callback belongs to.
 * @param props.isReady - Whether the provider has handled its response.
 * @param props.isSignedIn - Whether the user is signed in.
 * @param props.signInFailure - Whether sign-in was cancelled or failed.
 * @param props.destination - Where to go instead of the markers, such as the page a silent renewal started on.
 * @param props.onLeave - Clears the provider's error on retry and unmount.
 * @returns The failure message, or the pending message while redirecting.
 */
export default function SignInCallback({
  method,
  isReady,
  isSignedIn,
  signInFailure,
  destination,
  onLeave,
}: SignInCallbackProps): JSX.Element {
  const navigate = useNavigate()
  const hasNavigated = useRef(false)

  /** The return markers, read once before the effect clears them. */
  const [{ publicUrlSegment, returnAdminPath }] = useState(() => ({
    publicUrlSegment: sessionStorage.getItem(returnPublicUrlSegmentKey),
    returnAdminPath: sessionStorage.getItem(returnAdminPathKey),
  }))
  const isCreatingProfile = returnAdminPath === RoutePaths.AdminCreateProfile
  const hasFailed = !isSignedIn && signInFailure !== null

  useEffect(() => {
    if (!isReady || hasNavigated.current) {
      return
    }

    clearAuthReturnPaths()

    if (hasFailed) {
      return
    }

    /** Where a signed-in user was headed, or Home. */
    const nextPath =
      isSignedIn && destination
        ? destination
        : isSignedIn && isCreatingProfile
          ? RoutePaths.AdminCreateProfile
          : isSignedIn && publicUrlSegment
            ? RoutePaths.CandidateProfile(publicUrlSegment)
            : RoutePaths.Home
    navigate(nextPath, { replace: true })
    hasNavigated.current = true
  }, [
    destination,
    hasFailed,
    isCreatingProfile,
    isReady,
    isSignedIn,
    navigate,
    publicUrlSegment,
  ])

  useEffect(() => onLeave, [onLeave])

  if (hasFailed) {
    const isCancelled = signInFailure === SignInFailure.Cancelled
    /** The sign-in route to retry from, or null when nothing was pending. */
    const retryPath = isCreatingProfile
      ? RoutePaths.AdminCreateProfile
      : publicUrlSegment
        ? RoutePaths.CandidateAdmin(publicUrlSegment)
        : null

    /**
     * Clears the error and starts the same method again on the sign-in route.
     *
     * @param path - The sign-in route to retry from.
     */
    const retrySignIn = (path: string): void => {
      onLeave?.()
      navigate(path, { replace: true, state: retrySignInLocationState(method) })
    }

    /** Returns to the CV the user came from, or Home. */
    const goBack = (): void => {
      navigate(
        publicUrlSegment
          ? RoutePaths.CandidateProfile(publicUrlSegment)
          : RoutePaths.Home,
        { replace: true },
      )
    }

    return (
      <RouteMessage
        tone={isCancelled ? Tone.Neutral : Tone.Error}
        description={
          isCancelled
            ? "You weren't signed in. Try again when you're ready."
            : `${signInMethodNames[method]} sign-in couldn't be completed. Try again, or come back later.`
        }
        actions={
          <>
            {retryPath && (
              <button
                type="button"
                onClick={() => retrySignIn(retryPath)}
                className={primaryButton}
              >
                Try again
              </button>
            )}
            <button type="button" onClick={goBack} className={secondaryButton}>
              {publicUrlSegment ? "Back to CV" : "Open a CV"}
            </button>
          </>
        }
      >
        {isCancelled ? "Sign-in was cancelled" : "Sign-in didn't go through"}
      </RouteMessage>
    )
  }

  return (
    <RouteMessage
      tone={Tone.Pending}
      delayed
      description="Taking you back in a moment."
      showHomeButton={false}
    >
      Finishing sign-in
    </RouteMessage>
  )
}
