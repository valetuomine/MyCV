import type { JSX } from "react"
import { useTranslation } from "react-i18next"
import { ButtonVariant, type LanguageCode } from "../../../../types"
import Button from "../../../components/Button"
import LanguageFlag from "../../../components/LanguageFlag"
import { labelClassName } from "../../../components/labelClassName"
import { profileLanguages } from "../../schemas/profile-form-schema"

interface FormLanguageSwitchProps {
  label: string
  value: LanguageCode
  onSelect: (language: LanguageCode) => void
  erroredLanguages?: readonly LanguageCode[]
}

/**
 * A choice of one of the profile's languages inside a form, built like the
 * page's `LanguageToggle` but with its own state: one segment per language
 * with its flag and its name in that language, the chosen one marked with
 * `aria-pressed`. Each segment carries its language's `lang`, so a screen
 * reader pronounces the name right. A language whose fields fail validation
 * turns its whole segment danger red (`data-invalid`), like an invalid
 * field, and its name says so to screen readers.
 *
 * @param props - The component props.
 * @param props.label - The choice's visible label, which also names the group.
 * @param props.value - The chosen language.
 * @param props.onSelect - Chooses a language.
 * @param props.erroredLanguages - The languages whose fields have errors.
 * @returns The language choice.
 */
export default function FormLanguageSwitch({
  label,
  value,
  onSelect,
  erroredLanguages = [],
}: Readonly<FormLanguageSwitchProps>): JSX.Element {
  const { t } = useTranslation()

  return (
    <fieldset className="m-0 grid min-w-0 justify-items-start gap-2 border-0 p-0">
      <legend className={`mb-2 p-0 ${labelClassName}`}>{label}</legend>
      <div className="flex h-11 items-center gap-0.5 rounded-full border border-cv-field-border bg-cv-pane p-1 shadow-cv-edge forced-colors:shadow-none">
        {profileLanguages.map((code) => {
          const hasError = erroredLanguages.includes(code)

          return (
            <Button
              key={code}
              variant={ButtonVariant.Segment}
              aria-pressed={value === code}
              data-invalid={hasError ? true : undefined}
              onClick={() => onSelect(code)}
              className="gap-2"
            >
              <LanguageFlag language={code} />
              <span lang={code} className="text-sm">
                {t(`profileFields.languageNames.${code}`)}
              </span>
              {hasError && (
                <span className="sr-only">
                  {" "}
                  {t("profileFields.languageHasErrors")}
                </span>
              )}
            </Button>
          )
        })}
      </div>
    </fieldset>
  )
}
