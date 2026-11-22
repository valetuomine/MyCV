import { z } from "zod"
import { validationMessage } from "../../../i18n/validationMessage"
import { LanguageCode } from "../../../types"
import {
  hasTranslationContent,
  isAllowedProfileLink,
} from "../utils/profileFormUtils"

/** The languages a profile can have, in the order the form lists them. */
export const profileLanguages = [
  LanguageCode.Finnish,
  LanguageCode.English,
] as const

/** A language the profile can have. */
const languageCodeSchema = z.enum(profileLanguages)

/** One language's title, summary and location, with their length limits. */
const profileTranslationSchema = z.object({
  languageCode: languageCodeSchema,
  title: z.string().max(100, validationMessage("titleMax")),
  summary: z.string().max(2500, validationMessage("summaryMax")).nullable(),
  location: z.string().max(100, validationMessage("locationMax")).nullable(),
})

/**
 * An optional profile link of at most 500 characters, either an `http` or
 * `https` address or one without a scheme, as the API requires.
 */
const urlSchema = z
  .string()
  .max(500, validationMessage("linkMax"))
  .refine(isAllowedProfileLink, validationMessage("linkScheme"))
  .nullable()

/**
 * The profile form. Requires a full name, a default language and that
 * language's translation with a title, allows each language only once, and
 * requires a title for any other translation that has content. Its messages
 * are translation keys, which the fields translate when they show them.
 */
export const profileSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, validationMessage("fullNameRequired"))
      .max(100, validationMessage("fullNameMax")),
    linkedInUrl: urlSchema,
    gitHubUrl: urlSchema,
    defaultLanguageCode: languageCodeSchema,
    translations: z.array(profileTranslationSchema),
  })
  .superRefine(({ defaultLanguageCode, translations }, context) => {
    const languageCodes = new Set<string>()

    for (const [index, translation] of translations.entries()) {
      if (languageCodes.has(translation.languageCode)) {
        context.addIssue({
          code: "custom",
          message: validationMessage("duplicateTranslation"),
          path: ["translations", index, "languageCode"],
        })
      }
      languageCodes.add(translation.languageCode)

      if (translation.title.trim()) {
        continue
      }

      if (translation.languageCode === defaultLanguageCode) {
        context.addIssue({
          code: "custom",
          message: validationMessage("defaultTitleRequired"),
          path: ["translations", index, "title"],
        })
      } else if (hasTranslationContent(translation)) {
        context.addIssue({
          code: "custom",
          message: validationMessage("titleRequired"),
          path: ["translations", index, "title"],
        })
      }
    }

    if (
      !translations.some(
        ({ languageCode }) => languageCode === defaultLanguageCode,
      )
    ) {
      context.addIssue({
        code: "custom",
        message: validationMessage("defaultRequired"),
        path: ["translations"],
      })
    }
  })

/**
 * CV links taken by routes that start with a static segment: `/admin` and
 * `/print/:profileId`.
 */
const reservedPublicUrlSegments = new Set(["admin", "print"])

/**
 * The create-profile form: the profile form plus the public URL segment,
 * lowercased, made of letters and numbers separated by single hyphens, and
 * not one of the reserved `reservedPublicUrlSegments`.
 */
export const createProfileSchema = profileSchema.safeExtend({
  publicUrlSegment: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, validationMessage("cvLinkRequired"))
    .max(100, validationMessage("cvLinkMax"))
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, validationMessage("cvLinkFormat"))
    .refine(
      (publicUrlSegment) => !reservedPublicUrlSegments.has(publicUrlSegment),
      validationMessage("cvLinkReserved"),
    ),
})

export type ProfileSchema = z.infer<typeof profileSchema>
export type CreateProfileSchema = z.infer<typeof createProfileSchema>

/**
 * Builds the create form's values: an empty row for every language, and as
 * the default language the one the user is using the app in, so a profile
 * started in Finnish starts in Finnish and one started in English in
 * English.
 *
 * @param defaultLanguageCode - The UI language when the form is created.
 * @returns The create form's starting values.
 */
export function createProfileDefaultValues(
  defaultLanguageCode: LanguageCode,
): CreateProfileSchema {
  return {
    publicUrlSegment: "",
    fullName: "",
    linkedInUrl: "",
    gitHubUrl: "",
    defaultLanguageCode,
    translations: profileLanguages.map((languageCode) => ({
      languageCode,
      title: "",
      summary: "",
      location: "",
    })),
  }
}
