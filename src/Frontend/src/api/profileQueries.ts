import type { components } from "../generated/openapi"
import { apiBaseUrl, baseApi } from "./baseApi"

export type Profile = components["schemas"]["ProfileDto"]
export type ProfileAdmin = components["schemas"]["ProfileAdminDto"]
export type CreateProfileRequest = components["schemas"]["CreateProfileRequest"]
export type UpdateProfileRequest = components["schemas"]["UpdateProfileRequest"]
export type ProfilePicture = components["schemas"]["ProfilePictureDto"]

/**
 * Builds the URL of a profile picture from the API's `pictureUrl`, which is
 * relative to the API's origin. The picture is a public file, so `<img>`
 * loads it straight from this URL instead of through RTK Query.
 *
 * @param pictureUrl - The picture's path and version from the API.
 * @returns The picture's URL, or undefined when the profile has none.
 */
export function getProfilePictureUrl(
  pictureUrl: string | null | undefined,
): string | undefined {
  return pictureUrl ? `${apiBaseUrl}${pictureUrl}` : undefined
}

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

interface SaveProfilePictureArgs {
  profileId: string
  picture: Blob
  fileName: string
}

/**
 * Lists the profile's queries to refetch after a successful change, so the
 * CV and the edit view show it.
 *
 * @param error - The failed request's error, if it failed.
 * @param profileId - The changed profile.
 * @returns The profile's tag, or none after a failure.
 */
function profileTagsAfter(error: unknown, profileId: string) {
  return error ? [] : [{ type: "Profile" as const, id: profileId }]
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
        profileTagsAfter(error, profileId),
    }),
    /**
     * Uploads a new profile picture, which is saved at once, apart from the
     * profile's fields. The API processes it and replaces the old one.
     */
    saveProfilePicture: builder.mutation<
      ProfilePicture,
      SaveProfilePictureArgs
    >({
      query: ({ profileId, picture, fileName }) => {
        const body = new FormData()
        body.append("file", picture, fileName)
        return {
          url: `/api/Profile/${encodeURIComponent(profileId)}/picture`,
          method: "PUT",
          body,
        }
      },
      invalidatesTags: (_result, error, { profileId }) =>
        profileTagsAfter(error, profileId),
    }),
    /**
     * Saves the signed-in Google account's picture as the profile picture.
     * The API reads it from the Google sign-in, never from the request.
     */
    saveGoogleProfilePicture: builder.mutation<ProfilePicture, string>({
      query: (profileId) => ({
        url: `/api/Profile/${encodeURIComponent(profileId)}/picture/google`,
        method: "PUT",
      }),
      invalidatesTags: (_result, error, profileId) =>
        profileTagsAfter(error, profileId),
    }),
    /** Removes the profile picture, at once, and deletes it from storage. */
    deleteProfilePicture: builder.mutation<void, string>({
      query: (profileId) => ({
        url: `/api/Profile/${encodeURIComponent(profileId)}/picture`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, error, profileId) =>
        profileTagsAfter(error, profileId),
    }),
  }),
})

export const {
  useGetProfileQuery,
  useGetProfileAdminQuery,
  useCreateProfileMutation,
  useUpdateProfileMutation,
  useSaveProfilePictureMutation,
  useSaveGoogleProfilePictureMutation,
  useDeleteProfilePictureMutation,
} = profileQueries
