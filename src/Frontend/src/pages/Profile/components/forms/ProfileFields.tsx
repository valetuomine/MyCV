import { m as motion } from "framer-motion"
import type { JSX } from "react"
import { useFormContext, useFormState, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import type { LanguageCode } from "../../../../types"
import RHFInput from "../../../components/RHFInput"
import RHFTextarea from "../../../components/RHFTextarea"
import { paneReveal } from "../../../components/reveal"
import { labelClassName } from "../../../components/labelClassName"
import {
  profileLanguages,
  type ProfileSchema,
} from "../../schemas/profile-form-schema"
import FormLanguageSwitch from "./FormLanguageSwitch"
import { getErroredLanguages, useFormLanguage } from "./formLanguageContext"

interface ProfileFieldsProps {
  isDisabled: boolean
  isNew?: boolean
}

/** Each language's field labels and placeholders, which are examples in that language. */
const fieldTexts = {
  fi: {
    title: "profileFields.titleFi",
    titlePlaceholder: "profileFields.titleFiPlaceholder",
    summary: "profileFields.summaryFi",
    summaryPlaceholder: "profileFields.summaryFiPlaceholder",
    location: "profileFields.locationFi",
    locationPlaceholder: "profileFields.locationFiPlaceholder",
  },
  en: {
    title: "profileFields.titleEn",
    titlePlaceholder: "profileFields.titleEnPlaceholder",
    summary: "profileFields.summaryEn",
    summaryPlaceholder: "profileFields.summaryEnPlaceholder",
    location: "profileFields.locationEn",
    locationPlaceholder: "profileFields.locationEnPlaceholder",
  },
} as const

/**
 * The profile's form fields: basic details, the default language, and one
 * language's translation at a time, chosen with a language switch. The shown
 * language lives in `FormLanguageProvider`, which also picks the language
 * and field to focus after a failed submit; the switch marks every language
 * with errors. The other languages' unsaved values stay in the form while
 * their fields are hidden. Choosing a new default language also shows its
 * fields. When editing, a switch to a default language without a title
 * prompts for its details, so the switch can be saved once it has a title;
 * a new profile has no saved default to switch from, so it gets no prompt.
 * Another language's title is required only while it has content, so its
 * summary and location validate the title again when they change, once the
 * title validates itself, and its required mark shows only while it is
 * required. Fields that a failed submit shows shake like the ones it found
 * on screen.
 *
 * Each of the three groups takes its turn in the form's staggered entrance
 * (`paneReveal`), so the fields fade in without switching off their blur;
 * the languages' divider is a fading rule rather than a border for the same
 * reason. The translation's group wraps its fieldset, which a language
 * change remounts, so a language change never plays the entrance again.
 *
 * @param props - The component props.
 * @param props.isDisabled - Whether the fields are disabled, such as while saving.
 * @param props.isNew - Whether the profile is being created rather than edited.
 * @returns The fieldsets.
 */
export default function ProfileFields({
  isDisabled,
  isNew = false,
}: Readonly<ProfileFieldsProps>): JSX.Element {
  const { t } = useTranslation()
  const { control, setValue, trigger, getFieldState } =
    useFormContext<ProfileSchema>()
  const { errors, isSubmitted, dirtyFields, touchedFields } = useFormState({
    control,
  })
  const {
    activeLanguage,
    showLanguage,
    autoFocusField,
    focusRound,
    isShownBySubmit,
  } = useFormLanguage()
  const defaultLanguage = useWatch({ control, name: "defaultLanguageCode" })
  /** The shown language's row in the form's translations. */
  const activeIndex = profileLanguages.indexOf(activeLanguage)
  /** The default language's row in the form's translations. */
  const defaultIndex = profileLanguages.indexOf(defaultLanguage)
  const defaultTitle = useWatch({
    control,
    name: `translations.${defaultIndex}.title`,
  })
  const [activeSummary, activeLocation] = useWatch({
    control,
    name: [
      `translations.${activeIndex}.summary`,
      `translations.${activeIndex}.location`,
    ],
  })
  /** The languages whose fields fail validation, which the switch marks. */
  const erroredLanguages = getErroredLanguages(errors)

  /**
   * Makes a language the default and shows its fields. The default language
   * decides which title is required, so the titles that already validate
   * validate again: after a submit all translations, before it the titles
   * that were visited or show a message. A title not yet visited gets no
   * message from the switch alone.
   *
   * @param language - The new default language.
   */
  const chooseDefaultLanguage = (language: LanguageCode): void => {
    setValue("defaultLanguageCode", language, { shouldDirty: true })
    showLanguage(language)
    if (isSubmitted) {
      void trigger("translations")
      return
    }

    /** The titles that were visited or show a message. */
    const validatedTitles = profileLanguages
      .map((_, index) => `translations.${index}.title` as const)
      .filter((title) => {
        const { isTouched, invalid } = getFieldState(title)
        return isTouched || invalid
      })
    if (validatedTitles.length > 0) {
      void trigger(validatedTitles)
    }
  }

  const texts = fieldTexts[activeLanguage]
  const isDefault = activeLanguage === defaultLanguage
  /**
   * Whether the shown title is required, so its `*` follows the schema: the
   * default language's always, another language's while its summary or
   * location has content.
   */
  const isTitleRequired =
    isDefault || Boolean(activeSummary?.trim() || activeLocation?.trim())
  const titleName = `translations.${activeIndex}.title` as const
  /**
   * The title that the summary and location validate again when they
   * change: only once the title validates itself, after a submit or a visit
   * or with a message, so typing a summary doesn't flag a title not yet
   * visited.
   */
  const titleDeps =
    isSubmitted ||
    touchedFields.translations?.[activeIndex]?.title ||
    errors.translations?.[activeIndex]?.title
      ? titleName
      : undefined
  /**
   * Whether to ask for the default language's details: while editing, the
   * default language has changed from the saved one and has no title yet.
   */
  const showDefaultPrompt =
    !isNew &&
    isDefault &&
    Boolean(dirtyFields.defaultLanguageCode) &&
    !defaultTitle?.trim()

  return (
    <>
      <motion.fieldset
        variants={paneReveal}
        disabled={isDisabled}
        className="m-0 grid min-w-0 gap-5 border-0 p-0 sm:grid-cols-2"
      >
        <legend className="sr-only">{t("profileFields.basicDetails")}</legend>
        <div className="min-w-0 sm:col-span-2">
          <RHFInput<ProfileSchema>
            name="fullName"
            label={t("profileFields.fullName")}
            required
            maxLength={100}
            autoComplete="name"
            placeholder={t("profileFields.fullNamePlaceholder")}
          />
        </div>
        <RHFInput<ProfileSchema>
          name="gitHubUrl"
          label="GitHub"
          type="url"
          maxLength={500}
          autoComplete="url"
          placeholder={t("profileFields.gitHubPlaceholder")}
        />
        <RHFInput<ProfileSchema>
          name="linkedInUrl"
          label="LinkedIn"
          type="url"
          maxLength={500}
          autoComplete="url"
          placeholder={t("profileFields.linkedInPlaceholder")}
        />
      </motion.fieldset>
      <motion.fieldset
        variants={paneReveal}
        disabled={isDisabled}
        className="m-0 grid min-w-0 gap-6 border-0 p-0"
      >
        <legend className="sr-only">{t("profileFields.languages")}</legend>
        <div aria-hidden="true" className="h-px bg-cv-line opacity-reveal" />
        <div className="flex flex-wrap gap-x-10 gap-y-6">
          <FormLanguageSwitch
            label={t("profileFields.defaultLanguage")}
            value={defaultLanguage}
            onSelect={chooseDefaultLanguage}
          />
          <FormLanguageSwitch
            label={t("profileFields.editingLanguage")}
            value={activeLanguage}
            onSelect={showLanguage}
            erroredLanguages={erroredLanguages}
          />
        </div>
        <p className="m-0 max-w-[60ch] text-sm text-pretty text-cv-muted opacity-reveal">
          {t("profileFields.defaultLanguageHint")}
        </p>
      </motion.fieldset>
      <motion.div variants={paneReveal} className="grid min-w-0">
        <fieldset
          key={`${activeLanguage}-${focusRound}`}
          disabled={isDisabled}
          className="m-0 grid min-w-0 gap-5 border-0 p-0"
        >
          <legend className="mb-2 flex w-full opacity-reveal items-baseline gap-3 font-cv-display text-xl font-semibold tracking-tight text-cv-ink">
            {t(`profileFields.languageLabels.${activeLanguage}`)}
            <span className={labelClassName}>
              {isDefault
                ? t("profileFields.defaultBadge")
                : t("profileFields.optional")}
            </span>
          </legend>
          {showDefaultPrompt && (
            <p className="m-0 rounded-lg border border-cv-accent/40 opacity-reveal bg-cv-accent/8 px-4 py-3 text-sm text-pretty text-cv-ink">
              {t("profileFields.defaultLanguagePrompt")}
            </p>
          )}
          <RHFInput<ProfileSchema>
            name={`translations.${activeIndex}.title`}
            label={t(texts.title)}
            placeholder={t(texts.titlePlaceholder)}
            lang={activeLanguage}
            required={isTitleRequired}
            maxLength={100}
            autoFocus={autoFocusField === titleName}
            shakeOnMount={isShownBySubmit}
          />
          <RHFTextarea<ProfileSchema>
            name={`translations.${activeIndex}.summary`}
            label={t(texts.summary)}
            placeholder={t(texts.summaryPlaceholder)}
            lang={activeLanguage}
            maxLength={2500}
            deps={titleDeps}
            autoFocus={autoFocusField === `translations.${activeIndex}.summary`}
            shakeOnMount={isShownBySubmit}
          />
          <RHFInput<ProfileSchema>
            name={`translations.${activeIndex}.location`}
            label={t(texts.location)}
            placeholder={t(texts.locationPlaceholder)}
            lang={activeLanguage}
            maxLength={100}
            deps={titleDeps}
            autoFocus={
              autoFocusField === `translations.${activeIndex}.location`
            }
            shakeOnMount={isShownBySubmit}
          />
        </fieldset>
      </motion.div>
    </>
  )
}
