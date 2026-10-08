import type { components } from "../generated/openapi"
import { baseApi } from "./baseApi"

export type Profile = components["schemas"]["ProfileDto"]
type ProfileAdmin = components["schemas"]["ProfileAdminDto"]
type CreateProfileRequest = components["schemas"]["CreateProfileRequest"]
type UpdateProfileRequest = components["schemas"]["UpdateProfileRequest"]

interface UpdateProfileArgs {
  profileId: string
  body: UpdateProfileRequest
}

export const profileQueries = baseApi.injectEndpoints({
  endpoints: (builder) => ({
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
    getProfileAdmin: builder.query<ProfileAdmin, string>({
      query: (profileId) =>
        `/api/Profile/${encodeURIComponent(profileId)}/admin`,
      providesTags: (_result, _error, profileId) => [
        { type: "Profile", id: profileId },
      ],
    }),
    createProfile: builder.mutation<ProfileAdmin, CreateProfileRequest>({
      query: (body) => ({
        url: "/api/Profile",
        method: "POST",
        body,
      }),
      invalidatesTags: (result) =>
        result?.candidateId
          ? [{ type: "Candidate", id: result.candidateId }]
          : [],
    }),
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
