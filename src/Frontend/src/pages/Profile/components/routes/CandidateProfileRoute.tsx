import { skipToken } from "@reduxjs/toolkit/query"
import { useAtomValue } from "jotai"
import type { JSX } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { useGetCandidateQuery } from "../../../../api/candidateQueries"
import { useGetProfileQuery } from "../../../../api/profileQueries"
import { languageAtom } from "../../../../state/languageAtoms"
import ProfilePage from "../ProfilePage"
import ProfileSkeleton from "../ProfileSkeleton"
import RouteMessage from "../RouteMessage"
import { Tone } from "../../../../types"
import { describeRouteError } from "../../utils/describeRouteError"
import { RoutePaths } from "../../../../routePaths"

/**
 * The public CV route. Looks up the candidate by its public URL segment, then
 * loads and shows their profile in the UI language, with a skeleton while
 * loading and a message for a missing profile or a failed request. After a
 * language change, the CV in the previous language stays on screen until the
 * new one arrives.
 *
 * @returns The CV, its skeleton, or a message.
 */
export default function CandidateProfileRoute(): JSX.Element {
  const { t } = useTranslation()
  const { publicUrlSegment } = useParams()
  const language = useAtomValue(languageAtom)
  const candidateQuery = useGetCandidateQuery(publicUrlSegment ?? "", {
    skip: !publicUrlSegment,
  })
  const profileId = candidateQuery.data?.profileId
  const profileQuery = useGetProfileQuery(
    profileId ? { profileId, languageCode: language } : skipToken,
  )

  if (candidateQuery.isLoading) {
    return <ProfileSkeleton />
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

  if (!profileId || !publicUrlSegment) {
    return <RouteMessage>{t("cv.noProfile")}</RouteMessage>
  }

  if (profileQuery.isLoading) {
    return <ProfileSkeleton />
  }

  if (profileQuery.isError || !profileQuery.data) {
    const { message, retryable } = describeRouteError(profileQuery.error, t)
    return (
      <RouteMessage
        tone={Tone.Error}
        onRetry={retryable ? () => void profileQuery.refetch() : undefined}
      >
        {message}
      </RouteMessage>
    )
  }

  return (
    <ProfilePage
      values={profileQuery.data}
      pdfPath={RoutePaths.CandidatePdf(publicUrlSegment)}
    />
  )
}
