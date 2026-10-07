import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? ""

export const baseApi = createApi({
  reducerPath: "cvApi",
  baseQuery: fetchBaseQuery({ baseUrl: apiBaseUrl }),
  tagTypes: ["Candidate", "Profile"],
  endpoints: () => ({}),
})
