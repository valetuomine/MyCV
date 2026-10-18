export const returnPublicUrlSegmentKey = "mycv-admin-return-public-url-segment"
export const returnAdminPathKey = "mycv-admin-return-path"
export const logoutReturnPublicUrlSegmentKey =
  "mycv-logout-return-public-url-segment"

export function clearAuthReturnPaths(): void {
  sessionStorage.removeItem(returnPublicUrlSegmentKey)
  sessionStorage.removeItem(returnAdminPathKey)
  sessionStorage.removeItem(logoutReturnPublicUrlSegmentKey)
}
