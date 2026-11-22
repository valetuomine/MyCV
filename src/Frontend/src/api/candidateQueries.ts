import { defaultSerializeQueryArgs } from "@reduxjs/toolkit/query"
import type { components } from "../generated/openapi"
import { baseApi } from "./baseApi"

type Candidate = components["schemas"]["CandidateDto"]
type OwnCandidate = components["schemas"]["OwnCandidateDto"]

interface OwnCandidateArgs {
  /**
   * Whether a 401 shows the sign-in-again message and an expired Microsoft
   * session may be renewed with a redirect. False for the owner's CV view,
   * which reads the owner's settings in the background. Defaults to true.
   */
  reportsRefusal?: boolean
}

/**
 * Tells whether a call of `getOwnCandidate` reports its 401.
 *
 * @param args - The call's arguments, if any.
 * @returns False only for a background read.
 */
function reportsOwnRefusal(args: OwnCandidateArgs | void): boolean {
  return !args || args.reportsRefusal !== false
}

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
     * It also carries the owner's own settings, such as whether the notice
     * about the profile's missing languages is hidden for good, which the
     * owner's CV view reads in the background (`reportsRefusal: false`).
     * Every call shares one cache entry, and a call that reports its 401
     * fetches again when the entry was filled by a background read.
     */
    getOwnCandidate: builder.query<OwnCandidate, OwnCandidateArgs | void>({
      query: (args) => ({
        url: "/api/me/candidate",
        reportsRefusal: args ? args.reportsRefusal : undefined,
      }),
      extraOptions: { requiresSignIn: true },
      serializeQueryArgs: ({ endpointName, endpointDefinition }) =>
        defaultSerializeQueryArgs({
          endpointName,
          endpointDefinition,
          queryArgs: undefined,
        }),
      forceRefetch: ({ currentArg, previousArg }) =>
        reportsOwnRefusal(currentArg) && !reportsOwnRefusal(previousArg),
      providesTags: ["Session"],
      keepUnusedDataFor: 0,
    }),
    /**
     * Hides the notice about the profile's missing languages for good, on
     * every device. Once the API has saved it, the owner's own CV in the
     * cache takes the new setting, so the notice goes without a refetch; a
     * failed request changes nothing, so the notice stays with its error.
     */
    hideMissingLanguageNotice: builder.mutation<void, void>({
      query: () => ({
        url: "/api/me/missing-language-notice",
        method: "PUT",
      }),
      extraOptions: { requiresSignIn: true },
      /**
       * Writes the hidden choice into the owner's cached CV once the API has
       * saved it, and leaves the cache as it was when the request fails.
       *
       * @param _arg - The mutation's argument, unused.
       * @param api - RTK Query's lifecycle helpers.
       * @param api.dispatch - Dispatches the cache update.
       * @param api.queryFulfilled - Settles when the request finishes.
       */
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
        } catch {
          return
        }
        dispatch(
          candidateQueries.util.updateQueryData(
            "getOwnCandidate",
            undefined,
            (draft) => {
              draft.hideMissingLanguageNotice = true
            },
          ),
        )
      },
    }),
  }),
})

export const {
  useGetCandidateQuery,
  useGetFeaturedCandidateQuery,
  useGetOwnCandidateQuery,
  useHideMissingLanguageNoticeMutation,
  useLazyGetCandidateQuery,
} = candidateQueries
