import type { components } from "../generated/openapi"
import { baseApi } from "./baseApi"

type Candidate = components["schemas"]["CandidateDto"]

/** Candidate endpoints. */
export const candidateQueries = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Looks up a candidate by its public URL segment. */
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
