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

export default function AuthCallbackRoute(): JSX.Element {
  const { accounts, inProgress } = useMsal()
  const navigate = useNavigate()
  const hasNavigated = useRef(false)
  const redirectError = useSyncExternalStore(
    subscribeRedirectSignInError,
    getRedirectSignInError,
  )

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
    const retryPath = isCreatingProfile
      ? RoutePaths.AdminCreateProfile
      : publicUrlSegment
        ? RoutePaths.CandidateAdmin(publicUrlSegment)
        : null

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
                onClick={() => {
                  clearRedirectSignInError()
                  navigate(retryPath, { replace: true })
                }}
                className={primaryButton}
              >
                Try again
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                navigate(
                  publicUrlSegment
                    ? RoutePaths.CandidateProfile(publicUrlSegment)
                    : RoutePaths.Home,
                  { replace: true },
                )
              }
              className={secondaryButton}
            >
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
