import { useMatch } from "react-router-dom"
import { RoutePaths } from "../routePaths"

/**
 * Finds the CV that a sign-out should return to: the one on screen, whether
 * it is viewed or being signed in to.
 *
 * @returns The CV's public URL segment, or undefined on the create-profile page and Home.
 */
export default function useSignOutReturnSegment(): string | undefined {
  const createProfileMatch = useMatch(RoutePaths.AdminCreateProfile)
  const candidateAdminMatch = useMatch(RoutePaths.CandidateAdminPattern)
  const candidateProfileMatch = useMatch(RoutePaths.CandidateProfilePattern)

  return createProfileMatch
    ? undefined
    : (candidateAdminMatch ?? candidateProfileMatch)?.params.publicUrlSegment
}
