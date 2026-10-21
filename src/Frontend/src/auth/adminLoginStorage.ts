import { SignOutReason } from "../types"

/** Session-storage key for the CV to manage after the sign-in redirect. */
export const returnPublicUrlSegmentKey = "mycv-admin-return-public-url-segment"
/** Session-storage key for the admin page to open after the sign-in redirect. */
export const returnAdminPathKey = "mycv-admin-return-path"
/**
 * Session-storage key set before a sign-out lands on Home: the CV to return
 * to, or "" to stay on Home.
 */
export const logoutReturnPublicUrlSegmentKey =
  "mycv-logout-return-public-url-segment"
/** Session-storage key set with the logout return marker: why the user was signed out. */
export const signOutReasonKey = "mycv-sign-out-reason"
/**
 * Local-storage key set on every sign-out, so the next sign-in asks for
 * credentials again in any tab, even while the Microsoft session is alive.
 */
export const signInPromptRequiredKey = "mycv-sign-in-prompt-required"

/** Removes every sign-in and sign-out return marker from session storage. */
export function clearAuthReturnPaths(): void {
  sessionStorage.removeItem(returnPublicUrlSegmentKey)
  sessionStorage.removeItem(returnAdminPathKey)
  sessionStorage.removeItem(logoutReturnPublicUrlSegmentKey)
  sessionStorage.removeItem(signOutReasonKey)
}

/**
 * Stores where Home sends the user after a sign-out, and why they were
 * signed out, replacing any other return markers. Also requires the next
 * sign-in to ask for credentials.
 *
 * @param publicUrlSegment - The CV to return to, or undefined to stay on Home.
 * @param reason - Whether the user signed out or was signed out when idle.
 */
export function storeSignOutReturn(
  publicUrlSegment: string | undefined,
  reason: SignOutReason,
): void {
  clearAuthReturnPaths()
  sessionStorage.setItem(
    logoutReturnPublicUrlSegmentKey,
    publicUrlSegment ?? "",
  )
  sessionStorage.setItem(signOutReasonKey, reason)
  localStorage.setItem(signInPromptRequiredKey, "true")
}

/**
 * Tells whether the user has signed out since their last sign-in, so the
 * next sign-in must ask for credentials.
 *
 * @returns True when a sign-out is pending a credential prompt.
 */
export function isSignInPromptRequired(): boolean {
  return localStorage.getItem(signInPromptRequiredKey) !== null
}

/** Lets later sign-ins reuse the Microsoft session again, after a successful sign-in. */
export function clearSignInPromptRequired(): void {
  localStorage.removeItem(signInPromptRequiredKey)
}

/**
 * Reads why the user was signed out, as stored by `storeSignOutReturn`.
 *
 * @returns The stored reason, or `SignOutReason.User` when none is stored.
 */
export function readSignOutReason(): SignOutReason {
  return sessionStorage.getItem(signOutReasonKey) === SignOutReason.Idle
    ? SignOutReason.Idle
    : SignOutReason.User
}
