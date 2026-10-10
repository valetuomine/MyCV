import type { JSX, SubmitEventHandler } from "react"
import RHFInput from "../../../components/RHFInput"
import type { ProfileSchema } from "../../schemas/profile-form-schema"

interface EditableProfileFormProps {
  onCancel: () => void
  onSubmit: SubmitEventHandler<HTMLFormElement>
  isSaving: boolean
  saveError?: string
}

export default function EditableProfileForm({
  onCancel,
  onSubmit,
  isSaving,
  saveError,
}: EditableProfileFormProps): JSX.Element {
  return (
    <form
      onSubmit={onSubmit}
      className="grid w-full max-w-3xl gap-6"
      noValidate
      aria-busy={isSaving}
    >
      <h1 className="m-0 font-cv-serif text-4xl font-normal">Edit profile</h1>
      <div className="grid w-full gap-5 sm:grid-cols-2">
        <RHFInput<ProfileSchema>
          name="fullName"
          label="Full name"
          isEditing
          required
          autoComplete="name"
        />
        <RHFInput<ProfileSchema>
          name="gitHubUrl"
          label="GitHub"
          isEditing
          type="url"
          autoComplete="url"
        />
        <RHFInput<ProfileSchema>
          name="linkedInUrl"
          label="LinkedIn"
          isEditing
          type="url"
          autoComplete="url"
        />
      </div>
      <fieldset
        disabled={isSaving}
        className="m-0 grid min-w-0 gap-5 border-0 p-0"
      >
        <legend className="mb-2 font-cv-serif text-2xl font-normal">
          Finnish
        </legend>
        <RHFInput<ProfileSchema>
          name="translations.0.title"
          label="Professional title (Finnish)"
          isEditing
          required
        />
        <RHFInput<ProfileSchema>
          name="translations.0.summary"
          label="Summary (Finnish)"
          isEditing
        />
        <RHFInput<ProfileSchema>
          name="translations.0.location"
          label="Location (Finnish)"
          isEditing
        />
        <legend className="mb-2 font-cv-serif text-2xl font-normal">
          English
        </legend>
        <RHFInput<ProfileSchema>
          name="translations.1.title"
          label="Professional title (English)"
          isEditing
        />
        <RHFInput<ProfileSchema>
          name="translations.1.summary"
          label="Summary (English)"
          isEditing
        />
        <RHFInput<ProfileSchema>
          name="translations.1.location"
          label="Location (English)"
          isEditing
        />
      </fieldset>
      {saveError && (
        <p role="alert" className="text-sm text-red-700">
          {saveError}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded border border-cv-paper bg-cv-paper px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white hover:text-cv-paper focus-visible:outline-2 focus-visible:outline-cv-accent"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="rounded border border-cv-muted bg-transparent px-5 py-2 text-sm font-medium text-cv-paper transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-cv-accent"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
