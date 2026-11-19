import { defaultSerializeQueryArgs } from "@reduxjs/toolkit/query"
import type { components } from "../generated/openapi"
import { apiBaseUrl, baseApi } from "./baseApi"

export type Profile = components["schemas"]["ProfileDto"]
export type ProfileAdmin = components["schemas"]["ProfileAdminDto"]
export type CreateProfileRequest = components["schemas"]["CreateProfileRequest"]
export type UpdateProfileRequest = components["schemas"]["UpdateProfileRequest"]
type ProfilePicture = components["schemas"]["ProfilePictureDto"]
type ProfilePictureVisibility =
  components["schemas"]["ProfilePictureVisibilityDto"]
export type UpdateProfilePictureVisibilityRequest =
  components["schemas"]["UpdateProfilePictureVisibilityRequest"]

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

interface ProfileAdminArgs {
  profileId: string
  /**
   * Whether a 401 shows the sign-in-again message and an expired Microsoft
   * session may be renewed with a redirect. False for the background check
   * of a public CV page, whose reader only reads it. Defaults to true.
   */
  reportsRefusal?: boolean
}

/**
 * Tells whether a call of `getProfileAdmin` reports its 401.
 *
 * @param args - The call's arguments, or undefined before the first call.
 * @returns False only for a background check.
 */
function reportsAdminRefusal(args: ProfileAdminArgs | undefined): boolean {
  return args?.reportsRefusal !== false
}

interface UpdateProfileArgs {
  profileId: string
  body: UpdateProfileRequest
}

interface SetProfilePictureVisibilityArgs {
  profileId: string
  body: UpdateProfilePictureVisibilityRequest
}

interface ProfilePicturePreviewArgs {
  profileId: string
  pictureUrl: string
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
     * Every call shares one cache entry per profile, so the edit view, the
     * edit-access check of a public CV page and `/:publicUrlSegment/admin`
     * read the same data. Each call says whether its 401 is reported
     * (`reportsRefusal`), and a call that reports it fetches again when the
     * entry was filled by a background check, so the edit view and the
     * admin route renew an expired session as before and the entry's later
     * refetches report a 401 too.
     */
    getProfileAdmin: builder.query<ProfileAdmin, ProfileAdminArgs>({
      query: ({ profileId, reportsRefusal = true }) => ({
        url: `/api/Profile/${encodeURIComponent(profileId)}/admin`,
        reportsRefusal,
      }),
      extraOptions: { requiresSignIn: true },
      serializeQueryArgs: ({ endpointName, endpointDefinition, queryArgs }) =>
        defaultSerializeQueryArgs({
          endpointName,
          endpointDefinition,
          queryArgs: queryArgs.profileId,
        }),
      forceRefetch: ({ currentArg, previousArg }) =>
        reportsAdminRefusal(currentArg) && !reportsAdminRefusal(previousArg),
      providesTags: (_result, _error, { profileId }) => [
        { type: "Profile", id: profileId },
        "Session",
      ],
    }),
    /**
     * Fetches the picture for the edit view's preview, signed in, because the
     * public picture URL is not found while the CV hides the picture. The
     * result is an object URL of the image, which `<img>` shows and which is
     * revoked when the cache entry goes. The picture's versioned
     * `pictureUrl` is part of the key, so a new picture is a new entry and a
     * loaded one is never fetched again; only a failed one refetches after
     * signing in again.
     */
    getProfilePicturePreview: builder.query<string, ProfilePicturePreviewArgs>({
      query: ({ profileId }) => ({
        url: `/api/Profile/${encodeURIComponent(profileId)}/picture/preview`,
        /**
         * Turns the image into an object URL, so the cache holds a string
         * rather than a Blob. A failure keeps its body as text.
         *
         * @param response - The API's response.
         * @returns The image's object URL, or the failure's text.
         */
        responseHandler: async (response: Response) =>
          response.ok
            ? URL.createObjectURL(await response.blob())
            : response.text(),
      }),
      extraOptions: { requiresSignIn: true },
      providesTags: (_result, error) => (error ? ["Session"] : []),
      /**
       * Revokes the object URL once the cache entry is removed.
       *
       * @param _args - The preview's arguments.
       * @param api - RTK Query's lifecycle helpers.
       * @param api.cacheDataLoaded - Settles with the first loaded URL.
       * @param api.cacheEntryRemoved - Settles when the entry is removed.
       */
      async onCacheEntryAdded(_args, { cacheDataLoaded, cacheEntryRemoved }) {
        const loaded = await cacheDataLoaded.catch(() => null)
        await cacheEntryRemoved
        if (loaded) {
          URL.revokeObjectURL(loaded.data)
        }
      },
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
      extraOptions: { requiresSignIn: true },
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
      extraOptions: { requiresSignIn: true },
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
      extraOptions: { requiresSignIn: true },
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
      extraOptions: { requiresSignIn: true },
      invalidatesTags: (_result, error, profileId) =>
        profileTagsAfter(error, profileId),
    }),
    /**
     * Shows or hides the picture section on the CV and its PDF, at once,
     * apart from the profile's fields. Hiding keeps the stored picture.
     * The asked value goes into the cached admin view at once, so the
     * switch shows it while the request and the refetch run, and a failure
     * restores the previous one. This is the only optimistic update of the
     * visibility.
     */
    setProfilePictureVisibility: builder.mutation<
      ProfilePictureVisibility,
      SetProfilePictureVisibilityArgs
    >({
      query: ({ profileId, body }) => ({
        url: `/api/Profile/${encodeURIComponent(profileId)}/picture/visibility`,
        method: "PUT",
        body,
      }),
      extraOptions: { requiresSignIn: true },
      invalidatesTags: (_result, error, { profileId }) =>
        profileTagsAfter(error, profileId),
      /**
       * Writes the asked visibility into the cached admin view, and undoes
       * it when the request fails.
       *
       * @param args - The mutation's arguments.
       * @param args.profileId - The changed profile.
       * @param args.body - The asked visibility.
       * @param api - RTK Query's lifecycle helpers.
       * @param api.dispatch - Dispatches the cache update.
       * @param api.queryFulfilled - Settles when the request finishes.
       */
      async onQueryStarted({ profileId, body }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          profileQueries.util.updateQueryData(
            "getProfileAdmin",
            { profileId },
            (draft) => {
              draft.showPicture = body.isVisible
            },
          ),
        )
        try {
          await queryFulfilled
        } catch {
          patch.undo()
        }
      },
    }),
    /** Removes the profile picture, at once, and deletes it from storage. */
    deleteProfilePicture: builder.mutation<void, string>({
      query: (profileId) => ({
        url: `/api/Profile/${encodeURIComponent(profileId)}/picture`,
        method: "DELETE",
      }),
      extraOptions: { requiresSignIn: true },
      invalidatesTags: (_result, error, profileId) =>
        profileTagsAfter(error, profileId),
    }),
  }),
})

export const {
  useGetProfileQuery,
  useGetProfileAdminQuery,
  useGetProfilePicturePreviewQuery,
  useCreateProfileMutation,
  useUpdateProfileMutation,
  useSaveProfilePictureMutation,
  useSaveGoogleProfilePictureMutation,
  useSetProfilePictureVisibilityMutation,
  useDeleteProfilePictureMutation,
} = profileQueries
