import type { components } from "../generated/openapi"
import { baseApi } from "./baseApi"

type Candidate = components["schemas"]["CandidateDto"]

export const candidateQueries = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCandidate: builder.query<Candidate, string>({
      query: (candidateId) =>
        `/api/Candidate/${encodeURIComponent(candidateId)}`,
      providesTags: (_result, _error, candidateId) => [
        { type: "Candidate", id: candidateId },
      ],
    }),
  }),
})

export const { useGetCandidateQuery } = candidateQueries
