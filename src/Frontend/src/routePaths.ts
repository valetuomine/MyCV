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
  CandidatePdfPattern: "/:publicUrlSegment/pdf",
  CandidateProfilePattern: "/:publicUrlSegment",
  ProfilePrintPattern: "/print/:profileId",
  /**
   * Builds the sign-in path for managing a candidate's CV.
   *
   * @param publicUrlSegment - The CV's public URL segment.
   * @returns The encoded `/:publicUrlSegment/admin` path.
   */
  CandidateAdmin: (publicUrlSegment: string) =>
    `/${encodeURIComponent(publicUrlSegment)}/admin`,
  /**
   * Builds the path of a candidate's CV as a PDF.
   *
   * @param publicUrlSegment - The CV's public URL segment.
   * @returns The encoded `/:publicUrlSegment/pdf` path.
   */
  CandidatePdf: (publicUrlSegment: string) =>
    `/${encodeURIComponent(publicUrlSegment)}/pdf`,
  /**
   * Builds the public path of a candidate's CV.
   *
   * @param publicUrlSegment - The CV's public URL segment.
   * @returns The encoded `/:publicUrlSegment` path.
   */
  CandidateProfile: (publicUrlSegment: string) =>
    `/${encodeURIComponent(publicUrlSegment)}`,
}
