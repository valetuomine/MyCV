import { z } from "zod"
import { LanguageCode } from "../../../types"

const profileTranslationSchema = z.object({
  languageCode: z.enum([LanguageCode.Finnish, LanguageCode.English]),
  title: z.string().max(100, "Title must be 100 characters or fewer"),
  summary: z
    .string()
    .max(2500, "Summary must be 2500 characters or fewer")
    .nullable(),
  location: z
    .string()
    .max(100, "Location must be 100 characters or fewer")
    .nullable(),
})

const urlSchema = z
  .string()
  .max(500, "Link must be 500 characters or fewer")
  .nullable()

export const profileSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Full name is required")
      .max(100, "Full name must be 100 characters or fewer"),
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
          message: `Only one ${translation.languageCode} translation is allowed`,
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
          message: "A title is required when translation content is provided",
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
        message: "A Finnish translation is required",
        path: ["translations"],
      })
    } else if (!finnishTranslation.title.trim()) {
      context.addIssue({
        code: "custom",
        message: "Finnish title is required",
        path: [
          "translations",
          translations.indexOf(finnishTranslation),
          "title",
        ],
      })
    }
  })

export const createProfileSchema = profileSchema.safeExtend({
  publicUrlSegment: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Your CV link is required")
    .max(100, "Your CV link must be 100 characters or fewer")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use letters and numbers separated by single hyphens",
    )
    .refine(
      (publicUrlSegment) => publicUrlSegment !== "admin",
      "This CV link is reserved",
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
