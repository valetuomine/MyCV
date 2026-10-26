import {
  atomWithStorage,
  createJSONStorage,
  unstable_withStorageValidator as withStorageValidator,
} from "jotai/utils"
import { LanguageCode } from "../types"

export const languageStorageKey = "cv-language"

/**
 * Tells whether a stored value is one of the app's languages.
 *
 * @param value - The value read from storage.
 * @returns Whether the value is a `LanguageCode`.
 */
function isLanguageCode(value: unknown): value is LanguageCode {
  return Object.values<unknown>(LanguageCode).includes(value)
}

/**
 * Reads the browser's language.
 *
 * @returns Finnish when the browser's language is Finnish, otherwise English.
 */
function getBrowserLanguage(): LanguageCode {
  return navigator.language.toLowerCase().startsWith(LanguageCode.Finnish)
    ? LanguageCode.Finnish
    : LanguageCode.English
}

/** Local storage for the language, which ignores a value that isn't a language. */
const languageStorage =
  withStorageValidator(isLanguageCode)(createJSONStorage<unknown>())

/**
 * Reads the language the app starts in, so i18next can start in it before
 * the first render.
 *
 * @returns The saved language, or the browser's when none is saved.
 */
export function readLanguage(): LanguageCode {
  return languageStorage.getItem(languageStorageKey, getBrowserLanguage())
}

/**
 * The UI language, saved in local storage. Reads the saved choice on init
 * and falls back to the browser's language. `LanguageToggle` keeps i18next
 * in step with it.
 */
export const languageAtom = atomWithStorage<LanguageCode>(
  languageStorageKey,
  getBrowserLanguage(),
  languageStorage,
  { getOnInit: true },
)
