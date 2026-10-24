import { LinkOutcome, SignInMethod } from "../types"

/** How adding a sign-in method ended, passed to the CV in router state. */
export interface LinkSignInResult {
  method: SignInMethod
  outcome: LinkOutcome
}

/** Router state attached when the linking callback returns to the CV. */
interface LinkSignInLocationState {
  linkSignIn: LinkSignInResult
}

/**
 * Builds the router state that opens the CV's admin view on its sign-in
 * methods, showing how adding one ended.
 *
 * @param result - The method being added and the outcome.
 * @returns The router state that `getLinkSignInResult` reads.
 */
export function linkSignInLocationState(
  result: LinkSignInResult,
): LinkSignInLocationState {
  return { linkSignIn: result }
}

/**
 * Reads the linking result from router state built by `linkSignInLocationState`.
 *
 * @param state - The router location's state.
 * @returns The result, or null when the CV was opened normally.
 */
export function getLinkSignInResult(state: unknown): LinkSignInResult | null {
  if (
    typeof state !== "object" ||
    state === null ||
    !("linkSignIn" in state) ||
    typeof state.linkSignIn !== "object" ||
    state.linkSignIn === null
  ) {
    return null
  }

  const { method, outcome } = state.linkSignIn as Partial<LinkSignInResult>
  return Object.values<unknown>(SignInMethod).includes(method) &&
    Object.values<unknown>(LinkOutcome).includes(outcome)
    ? (state.linkSignIn as LinkSignInResult)
    : null
}

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
