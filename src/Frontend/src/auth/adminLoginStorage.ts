export const returnPublicUrlSegmentKey = "mycv-admin-return-public-url-segment"
export const returnAdminPathKey = "mycv-admin-return-path"

export function clearLoginReturnPaths(): void {
  sessionStorage.removeItem(returnPublicUrlSegmentKey)
  sessionStorage.removeItem(returnAdminPathKey)
}
