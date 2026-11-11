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
    /**
     * Fetches the signed-in user's own CV. Answers 401 without a sign-in and
     * 404 when no CV is linked to it. It provides only the `Session` tag,
     * which only signing in again invalidates, so creating a CV on the
     * create form doesn't refetch it and redirect in the middle of the
     * form's own navigation; the route refetches it on mount instead. Its
     * result is dropped as soon as the route unmounts, so opening the route
     * again never shows a cached 404's create form before the new answer.
     */
    getOwnCandidate: builder.query<Candidate, void>({
      query: () => "/api/me/candidate",
      extraOptions: { requiresSignIn: true },
      providesTags: ["Session"],
      keepUnusedDataFor: 0,
    }),
  }),
})

export const {
  useGetCandidateQuery,
  useGetFeaturedCandidateQuery,
  useGetOwnCandidateQuery,
  useLazyGetCandidateQuery,
} = candidateQueries
