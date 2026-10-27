import type { components } from "../generated/openapi"
import { apiBaseUrl, baseApi } from "./baseApi"

export type Profile = components["schemas"]["ProfileDto"]
export type ProfileAdmin = components["schemas"]["ProfileAdminDto"]
export type CreateProfileRequest = components["schemas"]["CreateProfileRequest"]
export type UpdateProfileRequest = components["schemas"]["UpdateProfileRequest"]

interface ProfilePdfUrlArgs {
  profileId: string
  languageCode?: string
  download?: boolean
}

/**
 * Builds the URL of a profile's PDF. The PDF is a public file, so the browser
 * loads it straight from this URL, in an embedded viewer or as a download,
 * instead of through RTK Query.
 *
 * @param args - The URL's parts.
 * @param args.profileId - The profile to render.
 * @param args.languageCode - The PDF's language; the API defaults to Finnish.
 * @param args.download - Whether the API serves it as an attachment.
 * @returns The PDF's URL.
 */
export function getProfilePdfUrl({
  profileId,
  languageCode,
  download = false,
}: ProfilePdfUrlArgs): string {
  const params = new URLSearchParams()
  if (languageCode) {
    params.set("lang", languageCode)
  }
  if (download) {
    params.set("download", "true")
  }

  const query = params.size > 0 ? `?${params}` : ""
  return `${apiBaseUrl}/api/Profile/${encodeURIComponent(profileId)}/pdf${query}`
}

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
