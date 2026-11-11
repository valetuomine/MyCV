import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  FetchBaseQueryMeta,
} from "@reduxjs/toolkit/query"

/** The per-endpoint options that the session-aware base query reads. */
export interface SessionExtraOptions {
  /** Whether the endpoint needs a signed-in user, so its success proves the API accepts the session. */
  requiresSignIn?: boolean
  /** Whether a 401 shows the sign-in-again message; false for a background access check. Defaults to true. */
  reportsRefusal?: boolean
}

/** What the session-aware base query asks and tells about the session. */
export interface SessionHandlers {
  /** Tells whether a token renewal is leaving the page, so a 401 meanwhile means nothing. */
  isTokenRenewalPending: () => boolean
  /** Reads the session's generation, which grows each time the user signs in again. */
  currentGeneration: () => number
  /** Called when the API refuses the app's own token. */
  onSessionRefused: () => void
  /** Called when an endpoint that needs a signed-in user gets any HTTP answer but 401 to the app's own token. */
  onSessionAccepted: () => void
}

/** The lowest server error status: a gateway can send one without checking the token. */
const firstServerErrorStatus = 500

/** The base query that the session-aware one wraps, such as `fetchBaseQuery`. */
type RawBaseQuery = BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError,
  object,
  FetchBaseQueryMeta
>

/**
 * Tells whether a request sets its own `Authorization` header, such as
 * linking a sign-in method, instead of the app's own token.
 *
 * @param args - The request's URL or fetch arguments.
 * @returns True when the request carries its own `Authorization` header.
 */
export function hasOwnAuthorization(args: string | FetchArgs): boolean {
  const headers = typeof args === "string" ? undefined : args.headers
  if (!headers) {
    return false
  }

  if (headers instanceof Headers) {
    return headers.has("Authorization")
  }

  /** The header names whose value is set. */
  const names = Array.isArray(headers)
    ? headers.map(([name]) => name)
    : Object.entries(headers)
        .filter(([, value]) => value !== undefined)
        .map(([name]) => name)
  return names.some((name) => name.toLowerCase() === "authorization")
}

/**
 * Wraps a base query so the app hears when the API refuses or accepts the
 * signed-in session. A 401 to a request that used the app's own token
 * reports the session as refused, unless a token renewal is leaving the
 * page or the endpoint sets `reportsRefusal: false`. Any other answer below
 * 500 to an endpoint marked `requiresSignIn`, such as a 404 for a user
 * without a CV, proves the API accepted the token and reports the session
 * as accepted; a network error or a 5xx, which a gateway can send without
 * checking the token, proves nothing. A request with its own
 * `Authorization` header reports nothing, because it handles its own 401,
 * and neither does one sent before the session was last refused or signed
 * in again (`getSessionGeneration`). The result always goes back to the
 * caller unchanged.
 *
 * @param baseQuery - The base query to wrap.
 * @param handlers - The session callbacks.
 * @returns The wrapped base query.
 */
export function createSessionAwareBaseQuery(
  baseQuery: RawBaseQuery,
  handlers: SessionHandlers,
): BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError,
  SessionExtraOptions,
  FetchBaseQueryMeta
> {
  return async (args, api, extraOptions) => {
    const generation = handlers.currentGeneration()
    const result = await baseQuery(args, api, {})
    if (
      hasOwnAuthorization(args) ||
      generation !== handlers.currentGeneration()
    ) {
      return result
    }

    /** The answer's HTTP status, or a string such as `FETCH_ERROR`, or undefined on success. */
    const status = result.error?.status
    if (status === 401) {
      if (
        extraOptions?.reportsRefusal !== false &&
        !handlers.isTokenRenewalPending()
      ) {
        handlers.onSessionRefused()
      }
    } else if (
      extraOptions?.requiresSignIn &&
      (status === undefined ||
        (typeof status === "number" && status < firstServerErrorStatus))
    ) {
      handlers.onSessionAccepted()
    }

    return result
  }
}
