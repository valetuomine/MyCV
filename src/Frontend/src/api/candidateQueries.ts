import type { components } from "../generated/openapi"
import { baseApi } from "./baseApi"

type Candidate = components["schemas"]["CandidateDto"]

export const candidateQueries = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCandidate: builder.query<Candidate, string>({
      query: (publicUrlSegment) =>
        `/api/Candidate/${encodeURIComponent(publicUrlSegment)}`,
      providesTags: (_result, _error, publicUrlSegment) => [
        { type: "Candidate", id: publicUrlSegment },
      ],
    }),
  }),
})

export const { useGetCandidateQuery } = candidateQueries
