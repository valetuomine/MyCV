export const RoutePaths = {
  Home: "/",
  AdminCreateProfile: "/admin",
  AuthCallback: "/auth/callback",
  CandidateAdminPattern: "/:publicUrlSegment/admin",
  CandidateProfilePattern: "/:publicUrlSegment",
  CandidateAdmin: (publicUrlSegment: string) =>
    `/${encodeURIComponent(publicUrlSegment)}/admin`,
  CandidateProfile: (publicUrlSegment: string) =>
    `/${encodeURIComponent(publicUrlSegment)}`,
}
