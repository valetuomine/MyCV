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

const finlandTimeZone = "Europe/Helsinki"

/**
 * Reads the visitor's time zone, which stands in for their location without
 * asking for it or sending it anywhere.
 *
 * @returns The IANA time zone, or an empty string when the browser has none.
 */
function getTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? ""
  } catch {
    return ""
  }
}

/**
 * Detects the language for a visitor who hasn't chosen one: the browser's
 * language first, then the location from the time zone, so a Finnish visitor
 * with an English browser still gets Finnish.
 *
 * @returns Finnish when the browser's language is Finnish or the time zone is
 * Finland's, otherwise English.
 */
function getDetectedLanguage(): LanguageCode {
  const isFinnishBrowser =
    navigator.language?.toLowerCase().startsWith(LanguageCode.Finnish) ?? false
  return isFinnishBrowser || getTimeZone() === finlandTimeZone
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
 * @returns The saved language, or the detected one (`getDetectedLanguage`)
 * when none is saved. The detected language is never saved.
 */
export function readLanguage(): LanguageCode {
  return languageStorage.getItem(languageStorageKey, getDetectedLanguage())
}

/**
 * The UI language and its only source, saved in local storage. Reads the
 * saved choice on init and falls back to the detected language (the
 * browser's, then the time zone's), which is not saved. i18next starts in the
 * same language (`readLanguage`), and every write, here or in another tab,
 * switches it (`languageStorage`).
 */
export const languageAtom = atomWithStorage<LanguageCode>(
  languageStorageKey,
  getDetectedLanguage(),
  languageStorage,
  { getOnInit: true },
)
