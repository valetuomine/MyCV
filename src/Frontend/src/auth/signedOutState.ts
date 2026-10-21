/** Router state attached to the first navigation after a logout redirect. */
export const signedOutLocationState = { signedOut: true } as const

/**
 * Tells whether router state is `signedOutLocationState`.
 *
 * @param state - The router location's state.
 * @returns True on the first navigation after a logout redirect.
 */
export function isSignedOutLocationState(state: unknown): boolean {
  return (
    typeof state === "object" &&
    state !== null &&
    "signedOut" in state &&
    state.signedOut === true
  )
}
