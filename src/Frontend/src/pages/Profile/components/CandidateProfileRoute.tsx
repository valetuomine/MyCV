import { skipToken } from "@reduxjs/toolkit/query"
import type { JSX } from "react"
import { useParams } from "react-router-dom"
import { useGetCandidateQuery } from "../../../api/candidateQueries"
import { useGetProfileQuery } from "../../../api/profileQueries"
import CandidateCv from "./CandidateCv/CandidateCv"
import ProfileSkeleton from "./ProfileSkeleton"
import RouteMessage from "./RouteMessage"

export default function CandidateProfileRoute(): JSX.Element {
  const { candidateId } = useParams()
  const candidateQuery = useGetCandidateQuery(candidateId ?? "", {
    skip: !candidateId,
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
        tone="error"
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
        tone="error"
        onRetry={retryable ? () => void profileQuery.refetch() : undefined}
      >
        {message}
      </RouteMessage>
    )
  }

  return <CandidateCv values={profileQuery.data} />
}

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
