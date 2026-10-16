import type { JSX } from "react"
import RHFInput from "../../../components/RHFInput"
import type { ProfileSchema } from "../../schemas/profile-form-schema"

interface ProfileFieldsProps {
  isDisabled: boolean
}

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
        <RHFInput<ProfileSchema>
          name="fullName"
          label="Full name"
          isEditing
          required
          maxLength={100}
          autoComplete="name"
        />
        <RHFInput<ProfileSchema>
          name="gitHubUrl"
          label="GitHub"
          isEditing
          type="url"
          maxLength={500}
          autoComplete="url"
        />
        <RHFInput<ProfileSchema>
          name="linkedInUrl"
          label="LinkedIn"
          isEditing
          type="url"
          maxLength={500}
          autoComplete="url"
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
          isEditing
          required
          maxLength={100}
        />
        <RHFInput<ProfileSchema>
          name="translations.0.summary"
          label="Summary (Finnish)"
          isEditing
          multiline
          maxLength={2500}
        />
        <RHFInput<ProfileSchema>
          name="translations.0.location"
          label="Location (Finnish)"
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
          isEditing
          maxLength={100}
        />
        <RHFInput<ProfileSchema>
          name="translations.1.summary"
          label="Summary (English)"
          isEditing
          multiline
          maxLength={2500}
        />
        <RHFInput<ProfileSchema>
          name="translations.1.location"
          label="Location (English)"
          isEditing
          maxLength={100}
        />
      </fieldset>
    </>
  )
}
