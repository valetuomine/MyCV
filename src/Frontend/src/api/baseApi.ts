import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import { acquireApiToken, isGoogleRenewalPending } from "../auth/authSession"
import { isTokenRedirectPending } from "../auth/entraAuth"
import { RequestType } from "../types"
import {
  getSessionGeneration,
  reportSessionAccepted,
  reportSessionRefused,
} from "../auth/sessionRefusal"
import {
  createSessionAwareBaseQuery,
  type SessionExtraOptions,
} from "./sessionAwareBaseQuery"

/** The API origin from `VITE_API_BASE_URL`, or "" to call the same origin. */
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? ""

/**
 * Tells whether a request may leave the page for Microsoft when its token
 * needs the user to sign in again: only a query that needs a signed-in user
 * and reports its 401. A save must not, because the redirect would lose the
 * unsaved changes. Neither may a public read, such as a CV page, nor a
 * background check that hides its 401 (`reportsRefusal: false`), such as a
 * public CV reader's edit-access check, because the reader only reads the
 * page. Those requests go without a token, and the API's 401 is handled as
 * an expired session (`sessionRefusal.ts`) or ignored.
 *
 * @param type - Whether the request is a query or a mutation.
 * @param extraOptions - The endpoint's session options.
 * @returns True when the token renewal may start a redirect.
 */
function allowsTokenRedirect(
  type: RequestType,
  extraOptions: SessionExtraOptions | undefined,
): boolean {
  return (
    type === RequestType.Query &&
    extraOptions?.requiresSignIn === true &&
    extraOptions.reportsRefusal !== false
  )
}

/**
 * The RTK Query API that the feature query files inject their endpoints into.
 * Every request carries the signed-in user's bearer token, the Entra access
 * token or the Google ID token, when one can be acquired silently. A request
 * that sets its own `Authorization`, such as linking a sign-in method, keeps
 * it and starts no token renewal. `allowsTokenRedirect` decides which
 * requests may leave the page to renew a Microsoft token. A 401 to the
 * app's own token, outside a token renewal, shows the sign-in-again message
 * (`sessionRefusal.ts`), and signing in again refetches the queries tagged
 * `Session`, the endpoints that need a signed-in user.
 */
export const baseApi = createApi({
  reducerPath: "cvApi",
  baseQuery: createSessionAwareBaseQuery(
    fetchBaseQuery({
      baseUrl: apiBaseUrl,
      prepareHeaders: async (headers, { type, extraOptions }) => {
        if (headers.has("Authorization")) {
          return headers
        }

        const token = await acquireApiToken({
          allowRedirect: allowsTokenRedirect(
            type,
            extraOptions as SessionExtraOptions | undefined,
          ),
        })
        if (token) {
          headers.set("Authorization", `Bearer ${token}`)
        }
        return headers
      },
    }),
    {
      isTokenRenewalPending: () =>
        isGoogleRenewalPending() || isTokenRedirectPending(),
      currentGeneration: getSessionGeneration,
      onSessionRefused: reportSessionRefused,
      onSessionAccepted: reportSessionAccepted,
    },
  ),
  tagTypes: ["Candidate", "Profile", "Login", "Session"],
  endpoints: () => ({}),
})
