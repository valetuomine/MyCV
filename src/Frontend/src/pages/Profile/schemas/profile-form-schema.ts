import { z } from "zod"
import { validationMessage } from "../../../i18n/validationMessage"
import { LanguageCode } from "../../../types"

/** One language's title, summary and location, with their length limits. */
const profileTranslationSchema = z.object({
  languageCode: z.enum([LanguageCode.Finnish, LanguageCode.English]),
  title: z.string().max(100, validationMessage("titleMax")),
  summary: z.string().max(2500, validationMessage("summaryMax")).nullable(),
  location: z.string().max(100, validationMessage("locationMax")).nullable(),
})

/** An optional profile link of at most 500 characters. */
const urlSchema = z.string().max(500, validationMessage("linkMax")).nullable()

/**
 * The profile form. Requires a full name and a Finnish translation with a
 * title, allows each language only once, and requires a title for any
 * translation that has content. Its messages are translation keys, which
 * the fields translate when they show them.
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
    translations: z.array(profileTranslationSchema),
  })
  .superRefine(({ translations }, context) => {
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

      const hasContent = [
        translation.title,
        translation.summary,
        translation.location,
      ].some((value) => Boolean(value?.trim()))

      if (hasContent && !translation.title.trim()) {
        context.addIssue({
          code: "custom",
          message: validationMessage("titleRequired"),
          path: ["translations", index, "title"],
        })
      }
    }

    const finnishTranslation = translations.find(
      ({ languageCode }) => languageCode === LanguageCode.Finnish,
    )

    if (!finnishTranslation) {
      context.addIssue({
        code: "custom",
        message: validationMessage("finnishRequired"),
        path: ["translations"],
      })
    } else if (!finnishTranslation.title.trim()) {
      context.addIssue({
        code: "custom",
        message: validationMessage("finnishTitleRequired"),
        path: [
          "translations",
          translations.indexOf(finnishTranslation),
          "title",
        ],
      })
    }
  })

/**
 * CV links taken by routes that start with a static segment: `/admin` and
 * `/print/:profileId`.
 */
const reservedPublicUrlSegments = ["admin", "print"]

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
      (publicUrlSegment) =>
        !reservedPublicUrlSegments.includes(publicUrlSegment),
      validationMessage("cvLinkReserved"),
    ),
})

export type ProfileSchema = z.infer<typeof profileSchema>
export type CreateProfileSchema = z.infer<typeof createProfileSchema>

export const createProfileDefaultValues: CreateProfileSchema = {
  publicUrlSegment: "",
  fullName: "",
  linkedInUrl: "",
  gitHubUrl: "",
  translations: [
    {
      languageCode: LanguageCode.Finnish,
      title: "",
      summary: "",
      location: "",
    },
    {
      languageCode: LanguageCode.English,
      title: "",
      summary: "",
      location: "",
    },
  ],
}
