import { useCallback, useMemo, useState, type JSX, type ReactNode } from "react"
import { useFormContext, useFormState } from "react-hook-form"
import type { LanguageCode } from "../../../../types"
import {
  profileLanguages,
  type ProfileSchema,
} from "../../schemas/profile-form-schema"
import {
  FormLanguageContext,
  getErroredLanguages,
  type FormLanguage,
} from "./formLanguageContext"

/** The translated fields, in the order a failed submit looks for an error. */
const translationFields = ["title", "summary", "location"] as const

/**
 * Holds the language the profile form shows, one at a time, so the fields
 * and the edit view's preview follow the same language. It starts in the
 * default language.
 *
 * After a failed submit with translation errors, it shows the active
 * language when that has errors, and otherwise the first language with
 * errors. When translations are all that failed, React Hook Form has no
 * field on screen to focus, because the hidden languages' fields are not
 * mounted, so the shown language's first invalid field gets `autoFocus` and
 * a new focus round remounts its fields, which applies it even when the
 * language was already shown. With other errors, React Hook Form focuses
 * the first of them itself. `isShownBySubmit` tells the remounted fields
 * that a failed submit showed them, so they shake like the fields that
 * stayed mounted; choosing a language clears it. The check runs while
 * rendering, once per submit, as React's pattern for adjusting state when
 * its input changes.
 *
 * @param props - The component props.
 * @param props.children - The form content that reads the language.
 * @returns The children with the shown language.
 */
export default function FormLanguageProvider({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  const { control, getValues } = useFormContext<ProfileSchema>()
  const { errors, submitCount } = useFormState({ control })
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>(() =>
    getValues("defaultLanguageCode"),
  )
  const [checkedSubmitCount, setCheckedSubmitCount] = useState(submitCount)
  const [autoFocusField, setAutoFocusField] = useState<string | null>(null)
  const [focusRound, setFocusRound] = useState(0)
  const [isShownBySubmit, setIsShownBySubmit] = useState(false)

  if (submitCount !== checkedSubmitCount) {
    setCheckedSubmitCount(submitCount)
    /** The languages whose translation fields failed this submit. */
    const erroredLanguages = getErroredLanguages(errors)
    /**
     * The language to show: the active one when it has errors, else the
     * first with errors.
     */
    const target = erroredLanguages.includes(activeLanguage)
      ? activeLanguage
      : erroredLanguages[0]
    /** Whether translations are the only fields that failed. */
    const onlyTranslationErrors = Object.keys(errors).every(
      (name) => name === "translations",
    )

    if (target) {
      /** The target language's row in the form's translations. */
      const targetIndex = profileLanguages.indexOf(target)
      /** The first of the target language's fields with an error. */
      const field = translationFields.find(
        (name) => errors.translations?.[targetIndex]?.[name],
      )
      setActiveLanguage(target)
      setIsShownBySubmit(true)
      if (onlyTranslationErrors && field) {
        setAutoFocusField(`translations.${targetIndex}.${field}`)
        setFocusRound((round) => round + 1)
      } else {
        setAutoFocusField(null)
      }
    }
  }

  /**
   * Shows a language's fields.
   *
   * @param language - The language to show.
   */
  const showLanguage = useCallback((language: LanguageCode): void => {
    setAutoFocusField(null)
    setIsShownBySubmit(false)
    setActiveLanguage(language)
  }, [])

  /** The shared value, kept while nothing in it changes. */
  const formLanguage = useMemo<FormLanguage>(
    () => ({
      activeLanguage,
      showLanguage,
      autoFocusField,
      focusRound,
      isShownBySubmit,
    }),
    [activeLanguage, showLanguage, autoFocusField, focusRound, isShownBySubmit],
  )

  return (
    <FormLanguageContext value={formLanguage}>{children}</FormLanguageContext>
  )
}
