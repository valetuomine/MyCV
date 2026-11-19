import { useAtom } from "jotai"
import type { JSX } from "react"
import { useTranslation } from "react-i18next"
import { languageAtom } from "../../state/languageAtoms"
import { ButtonVariant, LanguageCode } from "../../types"
import Button from "./Button"
import LanguageFlag from "./LanguageFlag"

/** The languages in the order the toggle shows them. */
const languages = [LanguageCode.Finnish, LanguageCode.English]

/**
 * Switches the UI between Finnish and English: one segment per language
 * showing only its flag, the active one marked with `aria-pressed`. Each
 * segment is named in its own language ("Suomeksi", "In English"), and
 * carries that `lang`, so a screen reader pronounces it right whichever
 * language is active. Choosing a language writes `languageAtom`, which
 * switches i18next itself.
 *
 * @returns The language choice.
 */
export default function LanguageToggle(): JSX.Element {
  const { t } = useTranslation()
  const [language, setLanguage] = useAtom(languageAtom)

  return (
    <fieldset
      aria-label={t("language.label")}
      className="m-0 flex h-11 min-w-0 items-center gap-0.5 rounded-full border border-cv-field-border bg-cv-pane p-1 shadow-cv-edge forced-colors:shadow-none print:shadow-none"
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
        </Button>
      ))}
    </fieldset>
  )
}
