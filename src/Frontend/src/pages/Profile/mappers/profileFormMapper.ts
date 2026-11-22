import type {
  Profile,
  ProfileAdmin,
  CreateProfileRequest,
  UpdateProfileRequest,
} from "../../../api/profileQueries"
import { LanguageCode } from "../../../types"
import {
  profileLanguages,
  type CreateProfileSchema,
  type ProfileSchema,
} from "../schemas/profile-form-schema"
import { hasTranslationContent } from "../utils/profileFormUtils"

/**
 * Reads a language code from the API, ignoring its case.
 *
 * @param value - The language code as the API sent it.
 * @returns The matching profile language, or Finnish, the API's own fallback,
 *   when it is missing or unknown.
 */
function toProfileLanguage(value: string | null | undefined): LanguageCode {
  const code = value?.toLowerCase()
  return (
    profileLanguages.find((language) => language === code) ??
    LanguageCode.Finnish
  )
}

/**
 * Maps the admin profile to form values, with a row for every language in
 * the form's order, empty where a translation is missing.
 *
 * @param profile - The profile with all its translations.
 * @returns The form values.
 */
export function mapAdminProfileToForm(profile: ProfileAdmin): ProfileSchema {
  return {
    fullName: profile.fullName ?? "",
    linkedInUrl: profile.linkedInUrl ?? "",
    gitHubUrl: profile.gitHubUrl ?? "",
    defaultLanguageCode: toProfileLanguage(profile.defaultLanguageCode),
    translations: profileLanguages.map((languageCode) => {
      const translation = profile.translations?.find(
        (item) => item.languageCode?.toLowerCase() === languageCode,
      )

      return {
        languageCode,
        title: translation?.title ?? "",
        summary: translation?.summary ?? "",
        location: translation?.location ?? "",
      }
    }),
  }
}

/**
 * Maps the public profile to form values until the admin profile loads. The
 * public profile holds one language, so it fills that language's row and
 * leaves the others empty.
 *
 * @param profile - The public profile.
 * @returns The form values.
 */
export function mapProfileToForm(profile: Profile): ProfileSchema {
  /** The language the public profile's content is in, which fills its row. */
  const contentLanguage = toProfileLanguage(profile.languageCode)

  return {
    fullName: profile.fullName ?? "",
    linkedInUrl: profile.linkedInUrl ?? "",
    gitHubUrl: profile.gitHubUrl ?? "",
    defaultLanguageCode: toProfileLanguage(profile.defaultLanguageCode),
    translations: profileLanguages.map((languageCode) =>
      languageCode === contentLanguage
        ? {
            languageCode,
            title: profile.title ?? "",
            summary: profile.summary ?? "",
            location: profile.location ?? "",
          }
        : { languageCode, title: "", summary: "", location: "" },
    ),
  }
}

/**
 * Builds the update request from form values: trims text, sends empty
 * optional fields as null, always names the default language, and sends
 * only the translations with content, so the API removes an emptied one.
 *
 * @param data - The validated form values.
 * @returns The request body for saving the profile.
 */
export function toUpdateProfileRequest(
  data: ProfileSchema,
): UpdateProfileRequest {
  return {
    fullName: data.fullName.trim(),
    linkedInUrl: data.linkedInUrl?.trim() || null,
    gitHubUrl: data.gitHubUrl?.trim() || null,
    defaultLanguageCode: data.defaultLanguageCode,
    translations: data.translations
      .filter(hasTranslationContent)
      .map((translation) => ({
        languageCode: translation.languageCode,
        title: translation.title.trim(),
        summary: translation.summary?.trim() || null,
        location: translation.location?.trim() || null,
      })),
  }
}

/**
 * Builds the create request: the update request plus the public URL segment.
 *
 * @param data - The validated create-profile form values.
 * @returns The request body for creating the profile.
 */
export function toCreateProfileRequest(
  data: CreateProfileSchema,
): CreateProfileRequest {
  return {
    ...toUpdateProfileRequest(data),
    publicUrlSegment: data.publicUrlSegment,
  }
}
