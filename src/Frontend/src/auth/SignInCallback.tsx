import { useEffect, useState, type JSX } from "react"
import { useTranslation } from "react-i18next"
import { Navigate, useNavigate } from "react-router-dom"
import {
  clearAuthReturnPaths,
  returnAdminPathKey,
  returnPublicUrlSegmentKey,
} from "./adminLoginStorage"
import { signInMethodNames } from "./authSession"
import { retrySignInLocationState } from "./signInLocationState"
import RouteMessage from "../pages/Profile/components/RouteMessage"
import Button from "../pages/components/Button"
import { RoutePaths } from "../routePaths"
import { ButtonVariant, SignInFailure, Tone, type SignInMethod } from "../types"

interface SignInCallbackProps {
  method: SignInMethod
  isReady: boolean
  isSignedIn: boolean
  signInFailure: SignInFailure | null
  destination?: string | null
  onLeave?: () => void
}

/**
 * Picks where a signed-in user was headed: the given destination, then
 * profile creation, then the CV they came from, otherwise Home.
 *
 * @param targets - Where the user may have been headed.
 * @param targets.destination - The page given instead of the markers, if any.
 * @param targets.isCreatingProfile - Whether the user was creating a profile.
 * @param targets.publicUrlSegment - The CV the user came from, if any.
 * @returns The path to go to.
 */
function signedInPath({
  destination,
  isCreatingProfile,
  publicUrlSegment,
}: {
  destination?: string | null
  isCreatingProfile: boolean
  publicUrlSegment: string | null
}): string {
  if (destination) {
    return destination
  }

  if (isCreatingProfile) {
    return RoutePaths.AdminCreateProfile
  }

  return publicUrlSegment
    ? RoutePaths.CandidateProfile(publicUrlSegment)
    : RoutePaths.Home
}

/**
 * Shows that sign-in is finishing, until the provider has handled its
 * response and while the route changes.
 *
 * @returns The pending message.
 */
function SignInPending(): JSX.Element {
  const { t } = useTranslation()

  return (
    <RouteMessage
      tone={Tone.Pending}
      delayed
      description={t("signIn.finishingDescription")}
      showHomeButton={false}
    >
      {t("signIn.finishingTitle")}
    </RouteMessage>
  )
}

interface SignInOutcomeProps {
  method: SignInMethod
  isSignedIn: boolean
  signInFailure: SignInFailure | null
  destination?: string | null
  publicUrlSegment: string | null
  isCreatingProfile: boolean
  onLeave?: () => void
}

/**
 * The outcome of a sign-in whose response the provider has handled. When it
 * opens, it clears the return markers. A signed-in user goes to the given
 * destination, to profile creation or the CV they came from, otherwise
 * Home. A failed or cancelled sign-in shows a message naming the provider,
 * with a Try again that starts the same method on the sign-in route.
 *
 * @param props - The component props.
 * @param props.method - The provider the callback belongs to.
 * @param props.isSignedIn - Whether the user is signed in.
 * @param props.signInFailure - Whether sign-in was cancelled or failed.
 * @param props.destination - Where to go instead of the markers, if any.
 * @param props.publicUrlSegment - The CV the user came from, if any.
 * @param props.isCreatingProfile - Whether the user was creating a profile.
 * @param props.onLeave - Clears the provider's error on retry.
 * @returns The failure message, or a redirect to where the user was headed.
 */
function SignInOutcome({
  method,
  isSignedIn,
  signInFailure,
  destination,
  publicUrlSegment,
  isCreatingProfile,
  onLeave,
}: Readonly<SignInOutcomeProps>): JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    clearAuthReturnPaths()
  }, [])

  if (isSignedIn || signInFailure === null) {
    /** Where a signed-in user was headed, or Home. */
    const nextPath = isSignedIn
      ? signedInPath({ destination, isCreatingProfile, publicUrlSegment })
      : RoutePaths.Home

    return (
      <>
        <SignInPending />
        <Navigate to={nextPath} replace />
      </>
    )
  }

  /** Whether the user cancelled, which shows a neutral message instead of an error. */
  const isCancelled = signInFailure === SignInFailure.Cancelled
  /** The sign-in route of the CV the user came from, or null. */
  const cvRetryPath = publicUrlSegment
    ? RoutePaths.CandidateAdmin(publicUrlSegment)
    : null
  /** The sign-in route to retry from, or null when nothing was pending. */
  const retryPath = isCreatingProfile
    ? RoutePaths.AdminCreateProfile
    : cvRetryPath

  /**
   * Clears the error and starts the same method again on the sign-in route.
   *
   * @param path - The sign-in route to retry from.
   */
  const retrySignIn = (path: string): void => {
    onLeave?.()
    void navigate(path, {
      replace: true,
      state: retrySignInLocationState(method),
    })
  }

  /** Returns to the CV the user came from, or Home. */
  const goBack = (): void => {
    void navigate(
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
          ? t("signIn.cancelledDescription")
          : t("signIn.failedDescription", {
              provider: signInMethodNames[method],
            })
      }
      actions={
        <>
          {retryPath && (
            <Button
              variant={ButtonVariant.Primary}
              onClick={() => retrySignIn(retryPath)}
            >
              {t("common.tryAgain")}
            </Button>
          )}
          <Button onClick={goBack}>
            {publicUrlSegment ? t("common.backToCv") : t("common.openCv")}
          </Button>
        </>
      }
    >
      {isCancelled ? t("signIn.cancelledTitle") : t("signIn.failedTitle")}
    </RouteMessage>
  )
}

/**
 * The screen of a sign-in callback route, shared by Microsoft and Google.
 * It reads the return markers when it opens and shows the pending message
 * until the provider has handled its response, then `SignInOutcome` sends
 * the user on or explains a failed or cancelled sign-in.
 *
 * @param props - The component props.
 * @param props.method - The provider the callback belongs to.
 * @param props.isReady - Whether the provider has handled its response.
 * @param props.isSignedIn - Whether the user is signed in.
 * @param props.signInFailure - Whether sign-in was cancelled or failed.
 * @param props.destination - Where to go instead of the markers, such as the page a silent renewal started on.
 * @param props.onLeave - Clears the provider's error on retry and unmount.
 * @returns The pending message, or the sign-in's outcome.
 */
export default function SignInCallback({
  method,
  isReady,
  isSignedIn,
  signInFailure,
  destination,
  onLeave,
}: Readonly<SignInCallbackProps>): JSX.Element {
  /** The return markers, read once before the outcome clears them. */
  const [{ publicUrlSegment, returnAdminPath }] = useState(() => ({
    publicUrlSegment: sessionStorage.getItem(returnPublicUrlSegmentKey),
    returnAdminPath: sessionStorage.getItem(returnAdminPathKey),
  }))

  useEffect(() => onLeave, [onLeave])

  if (isReady) {
    return (
      <SignInOutcome
        method={method}
        isSignedIn={isSignedIn}
        signInFailure={signInFailure}
        destination={destination}
        publicUrlSegment={publicUrlSegment}
        isCreatingProfile={returnAdminPath === RoutePaths.AdminCreateProfile}
        onLeave={onLeave}
      />
    )
  }

  return <SignInPending />
}
