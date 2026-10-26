import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { readLanguage } from "../state/languageAtoms"
import { LanguageCode } from "../types"
import { en } from "./locales/en"
import { fi } from "./locales/fi"

/** Every language's texts, bundled with the app. */
const resources = {
  [LanguageCode.English]: { translation: en },
  [LanguageCode.Finnish]: { translation: fi },
}

/**
 * Puts the page itself in the active language: `<html lang>`, which the
 * Microsoft and Google sign-in pages follow (`signInLanguage.ts`), the
 * page title and the meta description. A CV page then names the tab after
 * its candidate again (`ProfilePage`).
 *
 * @param language - The language i18next switched to.
 */
function applyDocumentLanguage(language: string): void {
  document.documentElement.lang = language
  document.title = i18n.t("meta.title")
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", i18n.t("meta.description"))
}

i18n.on("languageChanged", applyDocumentLanguage)

void i18n.use(initReactI18next).init({
  resources,
  lng: readLanguage(),
  fallbackLng: LanguageCode.English,
  supportedLngs: Object.values(LanguageCode),
  interpolation: { escapeValue: false },
  initAsync: false,
})

export default i18n
