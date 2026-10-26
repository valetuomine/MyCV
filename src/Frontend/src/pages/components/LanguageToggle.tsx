import { useAtom } from "jotai"
import { useEffect, type JSX } from "react"
import { useTranslation } from "react-i18next"
import { languageAtom } from "../../state/languageAtoms"
import { ButtonVariant, LanguageCode } from "../../types"
import Button from "./Button"
import LanguageFlag from "./LanguageFlag"

/** The languages in the order the toggle shows them. */
const languages = [LanguageCode.Finnish, LanguageCode.English]

/**
 * Switches the UI between Finnish and English: one segment per language
 * with its flag and code, the active one marked with `aria-pressed`. Each
 * segment is named in its own language after its visible code ("FI –
 * Suomeksi", "EN – In English"), so speech control finds it by the code it
 * shows, and carries that `lang`, so a screen reader pronounces it right
 * whichever language is active. An effect keeps i18next on the chosen language, also
 * when another tab changes it. It skips a language i18next already has, so
 * the first render doesn't reset the page title a CV has set.
 *
 * @returns The language choice.
 */
export default function LanguageToggle(): JSX.Element {
  const { t, i18n } = useTranslation()
  const [language, setLanguage] = useAtom(languageAtom)

  useEffect(() => {
    if (i18n.language !== language) {
      void i18n.changeLanguage(language)
    }
  }, [i18n, language])

  return (
    <div
      role="group"
      aria-label={t("language.label")}
      className="flex h-11 items-center gap-0.5 rounded-full border border-cv-line bg-cv-wash p-1"
    >
      {languages.map((code) => (
        <Button
          key={code}
          variant={ButtonVariant.Segment}
          lang={code}
          aria-pressed={language === code}
          aria-label={t(`language.${code}`)}
          onClick={() => setLanguage(code)}
        >
          <LanguageFlag language={code} />
          {code.toUpperCase()}
        </Button>
      ))}
    </div>
  )
}
