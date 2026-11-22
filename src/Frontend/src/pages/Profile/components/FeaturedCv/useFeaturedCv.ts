import { skipToken } from "@reduxjs/toolkit/query"
import { useAtomValue } from "jotai"
import { useGetFeaturedCandidateQuery } from "../../../../api/candidateQueries"
import { useGetProfileQuery } from "../../../../api/profileQueries"
import { languageAtom } from "../../../../state/languageAtoms"
import { FeaturedCvStatus, type FeaturedCv } from "../../../../types"

/**
 * Fetches the CV the API features and then its profile in the current
 * language. It is `checking` while the featured CV's request is on its
 * first load, because the CV may not exist at all, and `loading` once the
 * CV is known and its profile is on its first load. It is `none` when no
 * CV is featured or a request fails, so the home page works without it. It
 * keeps the previous language's profile while another language loads, so
 * nothing blinks. The hero's address and the card call it both and share
 * the cached requests, so they always show the same CV.
 *
 * @returns The featured CV's state.
 */
export default function useFeaturedCv(): FeaturedCv {
  const language = useAtomValue(languageAtom)
  const featuredQuery = useGetFeaturedCandidateQuery()
  const candidate = featuredQuery.currentData
  const profileId = candidate?.profileId
  const profileQuery = useGetProfileQuery(
    profileId ? { profileId, languageCode: language } : skipToken,
  )
  /**
   * The featured CV's profile once it has loaded. It keeps the previous
   * language's profile while another language loads, so nothing blinks, and
   * drops it when the request fails.
   */
  const profile = profileQuery.isError ? undefined : profileQuery.data

  if (featuredQuery.isLoading) {
    return { status: FeaturedCvStatus.Checking }
  }

  if (profileQuery.isLoading) {
    return { status: FeaturedCvStatus.Loading }
  }

  if (!candidate?.publicUrlSegment || !profileId || !profile) {
    return { status: FeaturedCvStatus.None }
  }

  return {
    status: FeaturedCvStatus.Ready,
    profile,
    publicUrlSegment: candidate.publicUrlSegment,
  }
}
