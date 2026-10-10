import { z } from "zod"
import { LanguageCode } from "../../../types"

const profileTranslationSchema = z.object({
  languageCode: z.enum([LanguageCode.Finnish, LanguageCode.English]),
  title: z.string(),
  summary: z.string().nullable(),
  location: z.string().nullable(),
})

export const profileSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required"),
    linkedInUrl: z.string().nullable(),
    gitHubUrl: z.string().nullable(),
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
        path: ["translations", translations.indexOf(finnishTranslation), "title"],
      })
    }
  })

export type ProfileSchema = z.infer<typeof profileSchema>
