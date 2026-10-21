import type { components } from "../generated/openapi"
import { baseApi } from "./baseApi"

export type Profile = components["schemas"]["ProfileDto"]
export type ProfileAdmin = components["schemas"]["ProfileAdminDto"]
export type CreateProfileRequest = components["schemas"]["CreateProfileRequest"]
export type UpdateProfileRequest = components["schemas"]["UpdateProfileRequest"]

interface UpdateProfileArgs {
  profileId: string
  body: UpdateProfileRequest
}

/** Profile endpoints. */
export const profileQueries = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Fetches the public profile, in the requested language when given. */
    getProfile: builder.query<
      Profile,
      { profileId: string; languageCode?: string }
    >({
      query: ({ profileId, languageCode }) => ({
        url: `/api/Profile/${encodeURIComponent(profileId)}`,
        params: languageCode ? { lang: languageCode } : undefined,
      }),
      providesTags: (_result, _error, { profileId }) => [
        { type: "Profile", id: profileId },
      ],
    }),
    /**
     * Fetches the profile with every translation for editing. Succeeds only
     * for users allowed to edit it, so it also answers whether they can.
     */
    getProfileAdmin: builder.query<ProfileAdmin, string>({
      query: (profileId) =>
        `/api/Profile/${encodeURIComponent(profileId)}/admin`,
      providesTags: (_result, _error, profileId) => [
        { type: "Profile", id: profileId },
      ],
    }),
    /**
     * Creates a profile and refetches the candidate at its new public URL
     * segment.
     */
    createProfile: builder.mutation<ProfileAdmin, CreateProfileRequest>({
      query: (body) => ({
        url: "/api/Profile",
        method: "POST",
        body,
      }),
      invalidatesTags: (result) =>
        result?.publicUrlSegment
          ? [{ type: "Candidate", id: result.publicUrlSegment }]
          : [],
    }),
    /**
     * Saves a profile. After a successful save, both the public and the admin
     * profile queries refetch.
     */
    updateProfile: builder.mutation<ProfileAdmin, UpdateProfileArgs>({
      query: ({ profileId, body }) => ({
        url: `/api/Profile/${encodeURIComponent(profileId)}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, error, { profileId }) =>
        error ? [] : [{ type: "Profile", id: profileId }],
    }),
  }),
})

export const {
  useGetProfileQuery,
  useGetProfileAdminQuery,
  useCreateProfileMutation,
  useUpdateProfileMutation,
} = profileQueries
