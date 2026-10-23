/**
 * The app's routes. `*Pattern` entries are React Router patterns, and the
 * functions build concrete paths for a candidate.
 */
export const RoutePaths = {
  Home: "/",
  AdminCreateProfile: "/admin",
  AuthCallback: "/auth/callback",
  GoogleAuthCallback: "/auth/callback/google",
  CandidateAdminPattern: "/:publicUrlSegment/admin",
  CandidateProfilePattern: "/:publicUrlSegment",
  /**
   * Builds the sign-in path for managing a candidate's CV.
   *
   * @param publicUrlSegment - The CV's public URL segment.
   * @returns The encoded `/:publicUrlSegment/admin` path.
   */
  CandidateAdmin: (publicUrlSegment: string) =>
    `/${encodeURIComponent(publicUrlSegment)}/admin`,
  /**
   * Builds the public path of a candidate's CV.
   *
   * @param publicUrlSegment - The CV's public URL segment.
   * @returns The encoded `/:publicUrlSegment` path.
   */
  CandidateProfile: (publicUrlSegment: string) =>
    `/${encodeURIComponent(publicUrlSegment)}`,
}
