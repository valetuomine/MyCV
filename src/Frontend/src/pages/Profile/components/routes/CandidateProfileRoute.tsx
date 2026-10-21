import { skipToken } from "@reduxjs/toolkit/query"
import type { JSX } from "react"
import { useParams } from "react-router-dom"
import { useGetCandidateQuery } from "../../../../api/candidateQueries"
import { useGetProfileQuery } from "../../../../api/profileQueries"
import ProfilePage from "../ProfilePage"
import ProfileSkeleton from "../ProfileSkeleton"
import RouteMessage from "../RouteMessage"
import { Tone } from "../../../../types"

/**
 * The public CV route. Looks up the candidate by its public URL segment, then
 * loads and shows their profile, with a skeleton while loading and a message
 * for a missing profile or a failed request.
 *
 * @returns The CV, its skeleton, or a message.
 */
export default function CandidateProfileRoute(): JSX.Element {
  const { publicUrlSegment } = useParams()
  const candidateQuery = useGetCandidateQuery(publicUrlSegment ?? "", {
    skip: !publicUrlSegment,
  })
  const profileId = candidateQuery.data?.profileId
  const profileQuery = useGetProfileQuery(profileId ? { profileId } : skipToken)

  if (candidateQuery.isLoading) {
    return <ProfileSkeleton />
  }

  if (candidateQuery.isError) {
    const { message, retryable } = describeError(candidateQuery.error)
    return (
      <RouteMessage
        tone={Tone.Error}
        onRetry={retryable ? () => void candidateQuery.refetch() : undefined}
      >
        {message}
      </RouteMessage>
    )
  }

  if (!profileId) {
    return (
      <RouteMessage>This candidate does not have a profile yet.</RouteMessage>
    )
  }

  if (profileQuery.isLoading) {
    return <ProfileSkeleton />
  }

  if (profileQuery.isError || !profileQuery.data) {
    const { message, retryable } = describeError(profileQuery.error)
    return (
      <RouteMessage
        tone={Tone.Error}
        onRetry={retryable ? () => void profileQuery.refetch() : undefined}
      >
        {message}
      </RouteMessage>
    )
  }

  return <ProfilePage values={profileQuery.data} />
}

/**
 * Turns a failed request into a message, and tells whether retrying could
 * help: not for a missing CV, but yes for network and server errors.
 *
 * @param error - The RTK Query error.
 * @returns The message and whether to offer a retry.
 */
function describeError(error: unknown): {
  message: string
  retryable: boolean
} {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? error.status
      : undefined

  if (status === 404) {
    return {
      message: "We couldn't find that CV. Check the link and try again.",
      retryable: false,
    }
  }

  if (status === "FETCH_ERROR" || status === "TIMEOUT_ERROR") {
    return {
      message: "Can't reach the server. Check your connection and try again.",
      retryable: true,
    }
  }

  return {
    message: "Something went wrong while loading this CV.",
    retryable: true,
  }
}
