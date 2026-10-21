import { InteractionStatus } from "@azure/msal-browser"
import { useMsal } from "@azure/msal-react"
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type JSX,
} from "react"
import { useNavigate } from "react-router-dom"
import {
  clearAuthReturnPaths,
  returnPublicUrlSegmentKey,
  returnAdminPathKey,
} from "../adminLoginStorage"
import {
  clearRedirectSignInError,
  getRedirectSignInError,
  isSignInCancelled,
  subscribeRedirectSignInError,
} from "../entraAuth"
import RouteMessage from "../../pages/Profile/components/RouteMessage"
import {
  primaryButton,
  secondaryButton,
} from "../../pages/components/buttonStyles"
import { RoutePaths } from "../../routePaths"
import { Tone } from "../../types"

/**
 * The `/auth/callback` route that Microsoft redirects back to. Once MSAL has
 * handled the response, it clears the return markers and sends the user on:
 * to profile creation or the CV they came from when signed in, otherwise
 * Home. A failed or cancelled sign-in shows a message with a retry instead.
 *
 * @returns The failure message, or the pending message while redirecting.
 */
export default function AuthCallbackRoute(): JSX.Element {
  const { accounts, inProgress } = useMsal()
  const navigate = useNavigate()
  const hasNavigated = useRef(false)
  const redirectError = useSyncExternalStore(
    subscribeRedirectSignInError,
    getRedirectSignInError,
  )

  /** The return markers, read once before the effect clears them. */
  const [{ publicUrlSegment, returnAdminPath }] = useState(() => ({
    publicUrlSegment: sessionStorage.getItem(returnPublicUrlSegmentKey),
    returnAdminPath: sessionStorage.getItem(returnAdminPathKey),
  }))
  const isCreatingProfile = returnAdminPath === RoutePaths.AdminCreateProfile

  useEffect(() => {
    if (inProgress !== InteractionStatus.None || hasNavigated.current) {
      return
    }

    clearAuthReturnPaths()

    if (!accounts[0] && redirectError) {
      return
    }

    /** Where a signed-in user was headed, or Home. */
    const destination =
      accounts[0] && isCreatingProfile
        ? RoutePaths.AdminCreateProfile
        : accounts[0] && publicUrlSegment
          ? RoutePaths.CandidateProfile(publicUrlSegment)
          : RoutePaths.Home
    navigate(destination, { replace: true })
    hasNavigated.current = true
  }, [
    accounts,
    inProgress,
    isCreatingProfile,
    navigate,
    publicUrlSegment,
    redirectError,
  ])

  useEffect(() => clearRedirectSignInError, [])

  if (redirectError && !accounts[0]) {
    const cancelled = isSignInCancelled(redirectError)
    /** The sign-in route to retry from, or null when nothing was pending. */
    const retryPath = isCreatingProfile
      ? RoutePaths.AdminCreateProfile
      : publicUrlSegment
        ? RoutePaths.CandidateAdmin(publicUrlSegment)
        : null

    /**
     * Clears the error and starts sign-in again.
     *
     * @param path - The sign-in route to retry from.
     */
    const retrySignIn = (path: string): void => {
      clearRedirectSignInError()
      navigate(path, { replace: true })
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
        tone={cancelled ? Tone.Neutral : Tone.Error}
        description={
          cancelled
            ? "You weren't signed in. Try again when you're ready."
            : "Microsoft sign-in couldn't be completed. Try again, or come back later."
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
        {cancelled ? "Sign-in was cancelled" : "Sign-in didn't go through"}
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
