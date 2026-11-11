import { matchPath } from "react-router-dom"
import { RoutePaths } from "../routePaths"

/**
 * Finds the sign-in route for a page: `/admin` itself, or the CV's own
 * sign-in route for a CV page.
 *
 * @param path - The page, such as the one a silent renewal started on.
 * @returns The page's sign-in route, or Home when it has none.
 */
export function signInPathFor(path: string | null): string {
  if (!path) {
    return RoutePaths.Home
  }

  if (path === RoutePaths.AdminCreateProfile) {
    return RoutePaths.AdminCreateProfile
  }

  /** The CV the page belongs to, whether it was viewed or being signed in to. */
  const publicUrlSegment = (
    matchPath(RoutePaths.CandidateAdminPattern, path) ??
    matchPath(RoutePaths.CandidateProfilePattern, path)
  )?.params.publicUrlSegment

  return publicUrlSegment
    ? RoutePaths.CandidateAdmin(publicUrlSegment)
    : RoutePaths.Home
}
