import { type JSX } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import { useGetCandidateQuery } from "../../api/candidateQueries"
import RouteMessage from "../../pages/Profile/components/RouteMessage"
import { describeRouteError } from "../../pages/Profile/utils/describeRouteError"
import { RoutePaths } from "../../routePaths"
import { Tone } from "../../types"
import { returnPublicUrlSegmentKey } from "../adminLoginStorage"
import { useAuthSession } from "../authSession"
import SignInMessage from "../SignInMessage"
import SignInRouteFallback from "../SignInRouteFallback"
import useLoginRedirect from "../useLoginRedirect"

/**
 * The `/:publicUrlSegment/admin` route. Looks up the CV first, and only
 * when it exists lets the user choose a sign-in method and signs them in,
 * then returns them to the CV, where the edit action appears if they may
 * edit it. A blank address counts as a missing CV without a request, and
 * another address's CV never stands in while this one loads.
 *
 * @returns A loader or a message while the CV isn't found, a redirect to the
 *   CV once signed in, otherwise the sign-in screen.
 */
export default function AdminLoginRoute(): JSX.Element {
  const { t } = useTranslation()
  const { publicUrlSegment = "" } = useParams()
  const { isSignedIn, isBusy } = useAuthSession()
  const navigate = useNavigate()
  const isBlank = !publicUrlSegment.trim()
  const candidateQuery = useGetCandidateQuery(publicUrlSegment, {
    skip: isBlank,
  })
  const hasCandidate =
    !isBlank && Boolean(candidateQuery.currentData?.profileId)

  const loginRedirect = useLoginRedirect({
    enabled: hasCandidate,
    redirectPath: RoutePaths.CandidateAdmin(publicUrlSegment),
    storageKey: returnPublicUrlSegmentKey,
    storageValue: publicUrlSegment,
  })

  if (isBlank) {
    return <RouteMessage>{t("cv.notFound")}</RouteMessage>
  }

  if (candidateQuery.isFetching && !candidateQuery.currentData) {
    return <SignInRouteFallback />
  }

  if (candidateQuery.isError) {
    const { message, retryable } = describeRouteError(candidateQuery.error, t)
    return (
      <RouteMessage
        tone={Tone.Error}
        onRetry={retryable ? () => void candidateQuery.refetch() : undefined}
      >
        {message}
      </RouteMessage>
    )
  }

  if (!hasCandidate) {
    return <RouteMessage>{t("cv.noProfile")}</RouteMessage>
  }

  if (!isBusy && isSignedIn) {
    return (
      <Navigate to={RoutePaths.CandidateProfile(publicUrlSegment)} replace />
    )
  }

  return (
    <SignInMessage
      {...loginRedirect}
      title={
        <Trans
          i18nKey="signIn.manageTitle"
          values={{ cv: publicUrlSegment }}
          components={{ code: <code /> }}
        />
      }
      description={t("signIn.manageDescription")}
      pendingTitle={
        <Trans
          i18nKey="signIn.managePending"
          values={{ cv: publicUrlSegment }}
          components={{ code: <code /> }}
        />
      }
      backLabel={t("common.backToCv")}
      onBack={() =>
        navigate(RoutePaths.CandidateProfile(publicUrlSegment), {
          replace: true,
        })
      }
    />
  )
}
