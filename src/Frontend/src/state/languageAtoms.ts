import i18n from "i18next"
import {
  atomWithStorage,
  createJSONStorage,
  unstable_withStorageValidator as withStorageValidator,
} from "jotai/utils"
import { LanguageCode } from "../types"

const languageStorageKey = "cv-language"

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
const validatedLanguageStorage =
  withStorageValidator(isLanguageCode)(createJSONStorage<unknown>())

/**
 * Switches i18next to the language, unless it already has it, so the first
 * render doesn't reset the page title that a CV has set.
 *
 * @param language - The language to show.
 */
function applyLanguage(language: LanguageCode): void {
  if (i18n.language !== language) {
    void i18n.changeLanguage(language)
  }
}

/**
 * The language's storage, which also switches i18next whenever the language
 * is saved here or changed in another tab, so `languageAtom` is the UI
 * language's only source and no component has to keep the two in step.
 */
const languageStorage: typeof validatedLanguageStorage = {
  ...validatedLanguageStorage,
  setItem: (key, language) => {
    validatedLanguageStorage.setItem(key, language)
    applyLanguage(language)
  },
  subscribe: (key, callback, initialValue) =>
    validatedLanguageStorage.subscribe?.(
      key,
      (language) => {
        /** The language from the other tab, or the default when invalid. */
        const nextLanguage = isLanguageCode(language) ? language : initialValue
        applyLanguage(nextLanguage)
        callback(nextLanguage)
      },
      initialValue,
    ) ?? (() => undefined),
}

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
 * The UI language and its only source, saved in local storage. Reads the
 * saved choice on init and falls back to the browser's language. i18next
 * starts in the same language (`readLanguage`), and every write, here or in
 * another tab, switches it (`languageStorage`).
 */
export const languageAtom = atomWithStorage<LanguageCode>(
  languageStorageKey,
  getBrowserLanguage(),
  languageStorage,
  { getOnInit: true },
)
