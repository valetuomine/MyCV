import type {
  Profile,
  ProfileAdmin,
  UpdateProfileRequest,
} from "../../../api/profileQueries"
import { LanguageCode } from "../../../types"
import type { ProfileSchema } from "../schemas/profile-form-schema"

export function mapAdminProfileToForm(profile: ProfileAdmin): ProfileSchema {
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
