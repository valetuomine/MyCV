import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import { acquireApiToken, isGoogleRenewalPending } from "../auth/authSession"
import { isTokenRedirectPending } from "../auth/entraAuth"
import {
  getSessionGeneration,
  reportSessionAccepted,
  reportSessionRefused,
} from "../auth/sessionRefusal"
import { createSessionAwareBaseQuery } from "./sessionAwareBaseQuery"

/** The API origin from `VITE_API_BASE_URL`, or "" to call the same origin. */
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? ""

/**
 * The RTK Query API that the feature query files inject their endpoints into.
 * Every request carries the signed-in user's bearer token, the Entra access
 * token or the Google ID token, when one can be acquired silently. A request
 * that sets its own `Authorization`, such as linking a sign-in method, keeps
 * it and starts no token renewal. A 401 to the app's own token, outside a
 * token renewal, shows the sign-in-again message (`sessionRefusal.ts`), and
 * signing in again refetches the queries tagged `Session`, the endpoints
 * that need a signed-in user.
 */
export const baseApi = createApi({
  reducerPath: "cvApi",
  baseQuery: createSessionAwareBaseQuery(
    fetchBaseQuery({
      baseUrl: apiBaseUrl,
      prepareHeaders: async (headers) => {
        if (headers.has("Authorization")) {
          return headers
        }

        const token = await acquireApiToken()
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
