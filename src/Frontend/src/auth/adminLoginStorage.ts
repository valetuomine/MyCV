/** Session-storage key for the CV to manage after the sign-in redirect. */
export const returnPublicUrlSegmentKey = "mycv-admin-return-public-url-segment"
/** Session-storage key for the admin page to open after the sign-in redirect. */
export const returnAdminPathKey = "mycv-admin-return-path"
/**
 * Session-storage key set by `SignOutButton` before the logout redirect: the
 * CV to return to, or "" to stay on Home.
 */
export const logoutReturnPublicUrlSegmentKey =
  "mycv-logout-return-public-url-segment"

/** Removes every sign-in and sign-out return marker from session storage. */
export function clearAuthReturnPaths(): void {
  sessionStorage.removeItem(returnPublicUrlSegmentKey)
  sessionStorage.removeItem(returnAdminPathKey)
  sessionStorage.removeItem(logoutReturnPublicUrlSegmentKey)
}
