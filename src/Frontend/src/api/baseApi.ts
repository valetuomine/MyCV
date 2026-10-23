import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import { acquireApiToken } from "../auth/authSession"

/** The API origin from `VITE_API_BASE_URL`, or "" to call the same origin. */
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? ""

/**
 * The RTK Query API that the feature query files inject their endpoints into.
 * Every request carries the signed-in user's bearer token, the Entra access
 * token or the Google ID token, when one can be acquired silently.
 */
export const baseApi = createApi({
  reducerPath: "cvApi",
  baseQuery: fetchBaseQuery({
    baseUrl: apiBaseUrl,
    prepareHeaders: async (headers) => {
      const token = await acquireApiToken()
      if (token) {
        headers.set("Authorization", `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: ["Candidate", "Profile"],
  endpoints: () => ({}),
})
