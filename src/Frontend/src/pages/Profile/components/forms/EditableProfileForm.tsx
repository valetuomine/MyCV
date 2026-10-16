import type { JSX, SubmitEventHandler } from "react"
import {
  primaryButton,
  secondaryButton,
} from "../../../components/buttonStyles"
import ReadOnlyInput from "../../../components/ReadOnlyInput"
import ProfileFields from "./ProfileFields"

interface EditableProfileFormProps {
  onCancel: () => void
  onSubmit: SubmitEventHandler<HTMLFormElement>
  isSaving: boolean
  saveError?: string
  publicUrlSegment?: string
}

export default function EditableProfileForm({
  onCancel,
  onSubmit,
  isSaving,
  saveError,
  publicUrlSegment,
}: EditableProfileFormProps): JSX.Element {
  return (
    <form
      onSubmit={onSubmit}
      className="grid w-full max-w-3xl gap-6"
      noValidate
      aria-busy={isSaving}
    >
      <h1 className="m-0 font-cv-display text-4xl font-semibold tracking-tighter">
        Edit profile
      </h1>
      <ReadOnlyInput label="Your CV link" value={publicUrlSegment} />
      <ProfileFields isDisabled={isSaving} />
      {saveError && (
        <p role="alert" className="text-sm text-cv-danger">
          {saveError}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={isSaving} className={primaryButton}>
          {isSaving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className={secondaryButton}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
