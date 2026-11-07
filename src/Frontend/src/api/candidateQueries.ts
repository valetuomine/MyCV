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
    /**
     * Fetches the CV featured on the home page, which the API's settings
     * choose. Answers 404 when none is featured. It carries the same
     * Candidate tag as `getCandidate` for its CV, so whatever refetches that
     * candidate refetches the featured one too.
     */
    getFeaturedCandidate: builder.query<Candidate, void>({
      query: () => "/api/FeaturedCandidate",
      providesTags: (result) =>
        result?.publicUrlSegment
          ? [{ type: "Candidate", id: result.publicUrlSegment }]
          : [],
    }),
  }),
})

export const {
  useGetCandidateQuery,
  useGetFeaturedCandidateQuery,
  useLazyGetCandidateQuery,
} = candidateQueries
