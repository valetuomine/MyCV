import { createContext, use } from "react"
import type { FieldErrors } from "react-hook-form"
import type { LanguageCode } from "../../../../types"
import {
  profileLanguages,
  type ProfileSchema,
} from "../../schemas/profile-form-schema"

/** The language the profile form shows, shared by its fields and preview. */
export interface FormLanguage {
  activeLanguage: LanguageCode
  showLanguage: (language: LanguageCode) => void
  autoFocusField: string | null
  focusRound: number
  isShownBySubmit: boolean
}

/** Carries the profile form's shown language from `FormLanguageProvider`. */
export const FormLanguageContext = createContext<FormLanguage | null>(null)

/**
 * Reads the language the profile form shows.
 *
 * @returns The shown language, the field to focus after a failed submit, and
 *   a way to show another language.
 */
export function useFormLanguage(): FormLanguage {
  const formLanguage = use(FormLanguageContext)
  if (!formLanguage) {
    throw new Error("useFormLanguage must be used inside FormLanguageProvider")
  }
  return formLanguage
}

/**
 * Lists the languages whose translation fields fail validation.
 *
 * @param errors - The form's errors.
 * @returns The languages with errors, in the form's order.
 */
export function getErroredLanguages(
  errors: FieldErrors<ProfileSchema>,
): LanguageCode[] {
  return profileLanguages.filter((_, index) => errors.translations?.[index])
}
