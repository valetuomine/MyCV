import { SignInMethod, SignOutReason } from "../types"

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
/** Local-storage key for the method of the last successful sign-in, for the "Last used" badge. */
export const lastSignInMethodKey = "mycv-last-sign-in-method"
/** Session-storage key for the sign-in method being added while its redirect is under way. */
export const linkSignInKey = "mycv-link-sign-in"
/**
 * Local-storage key for the sign-in popups cancelled in the app. Local
 * storage, because a popup still shares it after Microsoft's sign-in page
 * has cut the popup off from the tab that opened it.
 */
const cancelledSignInPopupsKey = "mycv-cancelled-sign-in-popups"
/** How many cancelled popup attempts are remembered. */
const cancelledSignInPopupLimit = 10

/** What is being linked, stored before the redirect to the new method. It holds no tokens. */
export interface LinkSignInMarker {
  id: string
  method: SignInMethod
  publicUrlSegment: string
  sessionMethod: SignInMethod
  msalAccountId: string | null
}

/** Removes every sign-in, sign-out and linking marker from session storage. */
export function clearAuthReturnPaths(): void {
  sessionStorage.removeItem(returnPublicUrlSegmentKey)
  sessionStorage.removeItem(returnAdminPathKey)
  sessionStorage.removeItem(logoutReturnPublicUrlSegmentKey)
  sessionStorage.removeItem(signOutReasonKey)
  sessionStorage.removeItem(linkSignInKey)
}

/**
 * Stores the linking marker that the callback routes check first.
 *
 * @param marker - What is being linked and where to return.
 */
export function storeLinkSignInMarker(marker: LinkSignInMarker): void {
  sessionStorage.setItem(linkSignInKey, JSON.stringify(marker))
}

/**
 * Reads the linking marker.
 *
 * @returns The marker, or null when no linking is under way or it can't be read.
 */
export function readLinkSignInMarker(): LinkSignInMarker | null {
  try {
    const value = sessionStorage.getItem(linkSignInKey)
    return value ? (JSON.parse(value) as LinkSignInMarker) : null
  } catch {
    return null
  }
}

/** Removes the linking marker. */
export function clearLinkSignInMarker(): void {
  sessionStorage.removeItem(linkSignInKey)
}

/**
 * Reads the IDs of the sign-in popups cancelled in the app.
 *
 * @returns The IDs, newest first, or none when storage is unavailable.
 */
function readCancelledSignInPopups(): string[] {
  try {
    const ids: unknown = JSON.parse(
      localStorage.getItem(cancelledSignInPopupsKey) ?? "[]",
    )
    return Array.isArray(ids)
      ? ids.filter((id): id is string => typeof id === "string")
      : []
  } catch {
    return []
  }
}

/**
 * Remembers a sign-in popup cancelled in the app, so its window closes
 * without signing in if the user finishes there anyway. Storage can be
 * unavailable, for example in a private window, and the marker then just
 * isn't kept.
 *
 * @param attemptId - The popup attempt's ID.
 */
export function markSignInPopupCancelled(attemptId: string): void {
  try {
    localStorage.setItem(
      cancelledSignInPopupsKey,
      JSON.stringify(
        [attemptId, ...readCancelledSignInPopups()].slice(
          0,
          cancelledSignInPopupLimit,
        ),
      ),
    )
  } catch {
    return
  }
}

/**
 * Tells whether a sign-in popup was cancelled in the app.
 *
 * @param attemptId - The popup attempt's ID.
 * @returns True when the attempt was cancelled.
 */
export function isSignInPopupCancelled(attemptId: string): boolean {
  return readCancelledSignInPopups().includes(attemptId)
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

/**
 * Remembers the method of a successful sign-in. Storage can be unavailable,
 * for example in a private window, and the badge then just doesn't show.
 *
 * @param method - The method the user signed in with.
 */
export function storeLastSignInMethod(method: SignInMethod): void {
  try {
    localStorage.setItem(lastSignInMethodKey, method)
  } catch {
    return
  }
}

/**
 * Reads the method of the last successful sign-in.
 *
 * @returns The stored method, or null when none is stored or storage is unavailable.
 */
export function readLastSignInMethod(): SignInMethod | null {
  try {
    const method = localStorage.getItem(lastSignInMethodKey)
    return Object.values<string | null>(SignInMethod).includes(method)
      ? (method as SignInMethod)
      : null
  } catch {
    return null
  }
}
