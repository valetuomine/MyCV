import { skipToken } from "@reduxjs/toolkit/query"
import type { JSX } from "react"
import { useParams } from "react-router-dom"
import { useGetCandidateQuery } from "../../../api/candidateQueries"
import { useGetProfileQuery } from "../../../api/profileQueries"
import CandidateCv from "./CandidateCv/CandidateCv"

export default function CandidateProfileRoute(): JSX.Element {
  const { candidateId } = useParams()
  const candidateQuery = useGetCandidateQuery(candidateId ?? "", {
    skip: !candidateId,
  })
  const profileId = candidateQuery.data?.profileId
  const profileQuery = useGetProfileQuery(
    profileId ? { profileId } : skipToken,
  )

  if (candidateQuery.isLoading) {
    return <p role="status">Loading candidate…</p>
  }

  if (candidateQuery.isError) {
    return <p role="alert">{requestError(candidateQuery.error, "Candidate")}</p>
  }

  if (!profileId) {
    return <p role="status">This candidate does not have a profile yet.</p>
  }

  if (profileQuery.isLoading) {
    return <p role="status">Loading profile…</p>
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <p role="alert">
        {requestError(profileQuery.error, "Candidate profile")}
      </p>
    )
  }

  return <CandidateCv profile={profileQuery.data} />
}

function requestError(error: unknown, resource: string): string {
  if (typeof error === "object" && error !== null) {
    if ("status" in error) {
      if (error.status === 404) {
        return `${resource} was not found. Check the candidate ID in the URL.`
      }

      return `${resource} request failed (${String(error.status)}).`
    }

    if ("message" in error && typeof error.message === "string") {
      return `${resource} request failed: ${error.message}`
    }
  }

  return `${resource} request failed.`
}
