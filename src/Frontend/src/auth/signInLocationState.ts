import { SignInMethod } from "../types"

/** Router state attached when a callback's Try again returns to the sign-in route. */
interface RetrySignInLocationState {
  retrySignIn: SignInMethod
}

/**
 * Builds the router state that makes the sign-in route start a method again
 * at once.
 *
 * @param method - The sign-in method to retry.
 * @returns The router state that `getRetrySignInMethod` reads.
 */
export function retrySignInLocationState(
  method: SignInMethod,
): RetrySignInLocationState {
  return { retrySignIn: method }
}

/**
 * Reads the method to retry from router state built by `retrySignInLocationState`.
 *
 * @param state - The router location's state.
 * @returns The method to retry, or null when the route was opened normally.
 */
export function getRetrySignInMethod(state: unknown): SignInMethod | null {
  if (
    typeof state !== "object" ||
    state === null ||
    !("retrySignIn" in state)
  ) {
    return null
  }

  return Object.values<unknown>(SignInMethod).includes(state.retrySignIn)
    ? (state.retrySignIn as SignInMethod)
    : null
}
