import { SignOutReason } from "../types"

/** Router state attached to the first navigation after a sign-out. */
interface SignedOutLocationState {
  signedOut: SignOutReason
}

/**
 * Builds the router state for the first navigation after a sign-out.
 *
 * @param reason - Whether the user signed out or was signed out when idle.
 * @returns The router state that `SignedOutNotice` reads.
 */
export function signedOutLocationState(
  reason: SignOutReason,
): SignedOutLocationState {
  return { signedOut: reason }
}

/**
 * Reads the sign-out reason from router state built by `signedOutLocationState`.
 *
 * @param state - The router location's state.
 * @returns The reason on the first navigation after a sign-out, otherwise null.
 */
export function getSignOutReason(state: unknown): SignOutReason | null {
  if (typeof state !== "object" || state === null || !("signedOut" in state)) {
    return null
  }

  return Object.values<unknown>(SignOutReason).includes(state.signedOut)
    ? (state.signedOut as SignOutReason)
    : null
}
