// Router state attached to the first navigation after a logout redirect.
export const signedOutLocationState = { signedOut: true } as const

export function isSignedOutLocationState(state: unknown): boolean {
  return (
    typeof state === "object" &&
    state !== null &&
    "signedOut" in state &&
    state.signedOut === true
  )
}
