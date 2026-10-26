import type { JSX } from "react"
import { useTranslation } from "react-i18next"
import RHFInput from "../../../components/RHFInput"
import RHFTextarea from "../../../components/RHFTextarea"
import type { ProfileSchema } from "../../schemas/profile-form-schema"

interface ProfileFieldsProps {
  isDisabled: boolean
}

/**
 * The profile's form fields: basic details, the required Finnish translation
 * and the optional English one. Each translation's placeholders are examples
 * in that translation's own language.
 *
 * @param props - The component props.
 * @param props.isDisabled - Whether the fields are disabled, such as while saving.
 * @returns The fieldsets.
 */
export default function ProfileFields({
  isDisabled,
}: ProfileFieldsProps): JSX.Element {
  const { t } = useTranslation()

  return (
    <>
      <fieldset
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
      </fieldset>
      <fieldset
        disabled={isDisabled}
        className="m-0 grid min-w-0 gap-5 border-0 p-0"
      >
        <legend className="mb-2 flex w-full items-baseline gap-3 border-t border-cv-line pt-6 font-cv-display text-xl font-semibold tracking-tight text-cv-ink">
          {t("profileFields.finnish")}
          <span className="font-cv-mono text-xs font-normal tracking-wide text-cv-muted uppercase">
            {t("profileFields.required")}
          </span>
        </legend>
        <RHFInput<ProfileSchema>
          name="translations.0.title"
          label={t("profileFields.titleFi")}
          placeholder={t("profileFields.titleFiPlaceholder")}
          lang="fi"
          required
          maxLength={100}
        />
        <RHFTextarea<ProfileSchema>
          name="translations.0.summary"
          label={t("profileFields.summaryFi")}
          placeholder={t("profileFields.summaryFiPlaceholder")}
          lang="fi"
          maxLength={2500}
        />
        <RHFInput<ProfileSchema>
          name="translations.0.location"
          label={t("profileFields.locationFi")}
          placeholder={t("profileFields.locationFiPlaceholder")}
          lang="fi"
          maxLength={100}
        />
      </fieldset>
      <fieldset
        disabled={isDisabled}
        className="m-0 grid min-w-0 gap-5 border-0 p-0"
      >
        <legend className="mb-2 flex w-full items-baseline gap-3 border-t border-cv-line pt-6 font-cv-display text-xl font-semibold tracking-tight text-cv-ink">
          {t("profileFields.english")}
          <span className="font-cv-mono text-xs font-normal tracking-wide text-cv-muted uppercase">
            {t("profileFields.optional")}
          </span>
        </legend>
        <RHFInput<ProfileSchema>
          name="translations.1.title"
          label={t("profileFields.titleEn")}
          placeholder={t("profileFields.titleEnPlaceholder")}
          lang="en"
          maxLength={100}
        />
        <RHFTextarea<ProfileSchema>
          name="translations.1.summary"
          label={t("profileFields.summaryEn")}
          placeholder={t("profileFields.summaryEnPlaceholder")}
          lang="en"
          maxLength={2500}
        />
        <RHFInput<ProfileSchema>
          name="translations.1.location"
          label={t("profileFields.locationEn")}
          placeholder={t("profileFields.locationEnPlaceholder")}
          lang="en"
          maxLength={100}
        />
      </fieldset>
    </>
  )
}
