import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import { acquireApiAuthenticationResult } from "../auth/entraAuth"

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? ""

export const baseApi = createApi({
  reducerPath: "cvApi",
  baseQuery: fetchBaseQuery({
    baseUrl: apiBaseUrl,
    prepareHeaders: async (headers) => {
      const result = await acquireApiAuthenticationResult()
      if (result?.accessToken) {
        headers.set("Authorization", `Bearer ${result.accessToken}`)
      }
      return headers
    },
  }),
  tagTypes: ["Candidate", "Profile"],
  endpoints: () => ({}),
})
