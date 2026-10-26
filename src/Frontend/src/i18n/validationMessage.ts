import type { TFunction } from "i18next"
import type { en } from "./locales/en"

/** The translation key of a form validation message. */
export type ValidationMessage = `validation.${keyof typeof en.validation}`

/**
 * Builds a validation message for a Zod schema. The schema stores the key
 * rather than the text, and the field translates it when it shows, so the
 * message follows a language change at once.
 *
 * @param key - The message's key under `validation`.
 * @returns The message's full translation key.
 */
export function validationMessage(
  key: keyof typeof en.validation,
): ValidationMessage {
  return `validation.${key}`
}

/**
 * Translates a validation message that a schema built with
 * `validationMessage`, and passes any other message through.
 *
 * @param t - The translation function.
 * @param message - The message from the form's error, if any.
 * @returns The message in the active language, or undefined without one.
 */
export function translateValidationMessage(
  t: TFunction,
  message?: string,
): string | undefined {
  return message?.startsWith("validation.")
    ? t(message as ValidationMessage)
    : message
}
