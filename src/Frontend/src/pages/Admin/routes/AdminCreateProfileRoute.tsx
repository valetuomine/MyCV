import { useRef, type JSX } from "react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { Navigate, useNavigate } from "react-router-dom"
import { useGetOwnCandidateQuery } from "../../../api/candidateQueries"
import { returnAdminPathKey } from "../../../auth/adminLoginStorage"
import {
  isGoogleRenewalPending,
  isSignInConfigured,
  useAuthSession,
} from "../../../auth/authSession"
import SignInMessage from "../../../auth/SignInMessage"
import SignInRouteFallback from "../../../auth/SignInRouteFallback"
import useLoginRedirect from "../../../auth/useLoginRedirect"
import { RoutePaths } from "../../../routePaths"
import { Tone, type CreateProfileDraft } from "../../../types"
import CreateProfileForm from "../components/CreateProfileForm"
import RouteMessage from "../../Profile/components/RouteMessage"
import { errorStatus } from "../../Profile/utils/describeRouteError"

/**
 * Turns a failed look-up of the user's own CV into a message. A missing CV
 * (404) never reaches it, and a refused sign-in (401) only shows once the
 * shared sign-in-again message (`SessionExpiredMessage`) has closed.
 *
 * @param status - The failed look-up's status.
 * @param t - The translation function.
 * @returns The message.
 */
function describeOwnCvError(status: unknown, t: TFunction): string {
  if (status === 401) {
    return t("sessionExpired.refusedAgain")
  }

  return status === "FETCH_ERROR" || status === "TIMEOUT_ERROR"
    ? t("cv.unreachable")
    : t("createProfile.ownCvFailed")
}

/**
 * The `/admin` route for creating a profile. Lets the user choose a sign-in
 * method and signs them in first. Once signed in, it looks up the user's own
 * CV and sends an owner straight on to managing it; only a user without a CV
 * sees the form (`CreateProfileForm`), which mounts only then, so it takes
 * its default language from the UI language at that moment. The form stays
 * hidden during the look-up, so it never flashes before the redirect. The
 * route keeps what the user has entered (`draft`) while the form is hidden
 * for signing in again or a new look-up, so the form comes back as it was for
 * the same account (`draftOwner`), and empty for another one. When
 * the API no longer accepts the sign-in (401), the shared
 * `SessionExpiredMessage` offers to sign in again over the route, and
 * signing in again refetches the look-up through its `Session` tag. A 401
 * while a silent Google renewal is leaving for Google keeps the loader.
 *
 * @returns The sign-in screen until signed in, a loader during the look-up,
 *   a redirect to the user's own CV, an error message when the look-up fails,
 *   otherwise the create-profile form.
 */
export default function AdminCreateProfileRoute(): JSX.Element {
  const { t } = useTranslation()
  const { isSignedIn, isBusy, method, account } = useAuthSession()
  const navigate = useNavigate()
  const draft = useRef<CreateProfileDraft | null>(null)
  /** The session's method and account, which the form's draft belongs to. */
  const draftOwner = `${method}:${account?.username ?? ""}`
  /** Whether the user is signed in and settled, so their own CV can be looked up. */
  const canLookUpOwnCv = isSignInConfigured && isSignedIn && !isBusy
  const ownCandidate = useGetOwnCandidateQuery(undefined, {
    skip: !canLookUpOwnCv,
    refetchOnMountOrArgChange: true,
  })
  /** The status of the failed own-CV look-up, or null while it hasn't failed. */
  const ownCvErrorStatus = ownCandidate.isError
    ? errorStatus(ownCandidate.error)
    : null

  const loginRedirect = useLoginRedirect({
    enabled: true,
    redirectPath: RoutePaths.AdminCreateProfile,
    storageKey: returnAdminPathKey,
    storageValue: RoutePaths.AdminCreateProfile,
  })

  if (!canLookUpOwnCv) {
    return (
      <SignInMessage
        {...loginRedirect}
        title={t("createProfile.signInTitle")}
        description={t("createProfile.signInDescription")}
        pendingTitle={t("createProfile.signInPending")}
        backLabel={t("common.openCv")}
        onBack={() => navigate(RoutePaths.Home)}
      />
    )
  }

  if (ownCandidate.isFetching || ownCandidate.isUninitialized) {
    return <SignInRouteFallback />
  }

  if (ownCandidate.currentData?.publicUrlSegment) {
    return (
      <Navigate
        to={RoutePaths.CandidateAdmin(
          ownCandidate.currentData.publicUrlSegment,
        )}
        replace
      />
    )
  }

  if (ownCvErrorStatus === 401 && isGoogleRenewalPending()) {
    return <SignInRouteFallback />
  }

  if (ownCvErrorStatus !== null && ownCvErrorStatus !== 404) {
    return (
      <RouteMessage
        tone={Tone.Error}
        onRetry={() => void ownCandidate.refetch()}
      >
        {describeOwnCvError(ownCvErrorStatus, t)}
      </RouteMessage>
    )
  }

  return <CreateProfileForm draft={draft} draftOwner={draftOwner} />
}
