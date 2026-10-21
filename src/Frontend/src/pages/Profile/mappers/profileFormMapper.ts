import type {
  Profile,
  ProfileAdmin,
  CreateProfileRequest,
  UpdateProfileRequest,
} from "../../../api/profileQueries"
import { LanguageCode } from "../../../types"
import type {
  CreateProfileSchema,
  ProfileSchema,
} from "../schemas/profile-form-schema"

/**
 * Maps the admin profile to form values, with the Finnish and then the
 * English translation, empty where one is missing.
 *
 * @param profile - The profile with all its translations.
 * @returns The form values.
 */
export function mapAdminProfileToForm(profile: ProfileAdmin): ProfileSchema {
  /**
   * Finds a language's translation, ignoring the language code's case.
   *
   * @param languageCode - The language to find.
   * @returns The translation's form fields, empty when it is missing.
   */
  const translationFor = (languageCode: LanguageCode) => {
    const translation = profile.translations?.find(
      (item) => item.languageCode?.toLowerCase() === languageCode,
    )

    return {
      languageCode,
      title: translation?.title ?? "",
      summary: translation?.summary ?? "",
      location: translation?.location ?? "",
    }
  }

  return {
    fullName: profile.fullName ?? "",
    linkedInUrl: profile.linkedInUrl ?? "",
    gitHubUrl: profile.gitHubUrl ?? "",
    translations: [
      translationFor(LanguageCode.Finnish),
      translationFor(LanguageCode.English),
    ],
  }
}

/**
 * Maps the public profile to form values until the admin profile loads. The
 * public profile holds one language, so it fills the Finnish fields and
 * leaves English empty.
 *
 * @param profile - The public profile.
 * @returns The form values.
 */
export function mapProfileToForm(profile: Profile): ProfileSchema {
  return {
    fullName: profile.fullName ?? "",
    linkedInUrl: profile.linkedInUrl ?? "",
    gitHubUrl: profile.gitHubUrl ?? "",
    translations: [
      {
        languageCode: LanguageCode.Finnish,
        title: profile.title ?? "",
        summary: profile.summary ?? "",
        location: profile.location ?? "",
      },
      {
        languageCode: LanguageCode.English,
        title: "",
        summary: "",
        location: "",
      },
    ],
  }
}

/**
 * Builds the update request from form values: trims text, sends empty
 * optional fields as null, and drops translations other than Finnish that
 * have no content.
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
    translations: data.translations
      .filter(
        (translation) =>
          translation.languageCode === LanguageCode.Finnish ||
          Boolean(
            translation.title.trim() ||
            translation.summary?.trim() ||
            translation.location?.trim(),
          ),
      )
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
