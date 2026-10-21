import type { JSX } from "react"
import RHFInput from "../../../components/RHFInput"
import type { ProfileSchema } from "../../schemas/profile-form-schema"

interface ProfileFieldsProps {
  isDisabled: boolean
}

/**
 * The profile's form fields: basic details, the required Finnish translation
 * and the optional English one.
 *
 * @param props - The component props.
 * @param props.isDisabled - Whether the fields are disabled, such as while saving.
 * @returns The fieldsets.
 */
export default function ProfileFields({
  isDisabled,
}: ProfileFieldsProps): JSX.Element {
  return (
    <>
      <fieldset
        disabled={isDisabled}
        className="m-0 grid min-w-0 gap-5 border-0 p-0 sm:grid-cols-2"
      >
        <legend className="sr-only">Basic details</legend>
        <div className="min-w-0 sm:col-span-2">
          <RHFInput<ProfileSchema>
            name="fullName"
            label="Full name"
            isEditing
            required
            maxLength={100}
            autoComplete="name"
            placeholder="Maija Virtanen"
          />
        </div>
        <RHFInput<ProfileSchema>
          name="gitHubUrl"
          label="GitHub"
          isEditing
          type="url"
          maxLength={500}
          autoComplete="url"
          placeholder="https://github.com/username"
        />
        <RHFInput<ProfileSchema>
          name="linkedInUrl"
          label="LinkedIn"
          isEditing
          type="url"
          maxLength={500}
          autoComplete="url"
          placeholder="https://www.linkedin.com/in/username"
        />
      </fieldset>
      <fieldset
        disabled={isDisabled}
        className="m-0 grid min-w-0 gap-5 border-0 p-0"
      >
        <legend className="mb-2 flex w-full items-baseline gap-3 border-t border-cv-line pt-6 font-cv-display text-xl font-semibold tracking-tight text-cv-ink">
          Finnish
          <span className="font-cv-mono text-xs font-normal tracking-wide text-cv-muted uppercase">
            Required
          </span>
        </legend>
        <RHFInput<ProfileSchema>
          name="translations.0.title"
          label="Professional title (Finnish)"
          placeholder="Ohjelmistokehittäjä"
          isEditing
          required
          maxLength={100}
        />
        <RHFInput<ProfileSchema>
          name="translations.0.summary"
          label="Summary (Finnish)"
          placeholder="Lyhyt esittely sinusta ja osaamisestasi"
          isEditing
          multiline
          maxLength={2500}
        />
        <RHFInput<ProfileSchema>
          name="translations.0.location"
          label="Location (Finnish)"
          placeholder="Helsinki, Suomi"
          isEditing
          maxLength={100}
        />
      </fieldset>
      <fieldset
        disabled={isDisabled}
        className="m-0 grid min-w-0 gap-5 border-0 p-0"
      >
        <legend className="mb-2 flex w-full items-baseline gap-3 border-t border-cv-line pt-6 font-cv-display text-xl font-semibold tracking-tight text-cv-ink">
          English
          <span className="font-cv-mono text-xs font-normal tracking-wide text-cv-muted uppercase">
            Optional
          </span>
        </legend>
        <RHFInput<ProfileSchema>
          name="translations.1.title"
          label="Professional title (English)"
          placeholder="Software developer"
          isEditing
          maxLength={100}
        />
        <RHFInput<ProfileSchema>
          name="translations.1.summary"
          label="Summary (English)"
          placeholder="A short introduction to you and your skills"
          isEditing
          multiline
          maxLength={2500}
        />
        <RHFInput<ProfileSchema>
          name="translations.1.location"
          label="Location (English)"
          placeholder="Helsinki, Finland"
          isEditing
          maxLength={100}
        />
      </fieldset>
    </>
  )
}
