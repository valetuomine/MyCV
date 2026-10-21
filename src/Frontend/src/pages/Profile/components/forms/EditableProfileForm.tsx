import {
  useEffect,
  useRef,
  useState,
  type JSX,
  type SubmitEventHandler,
} from "react"
import { flushSync } from "react-dom"
import { useFormState } from "react-hook-form"
import CopyLinkButton from "../../../components/CopyLinkButton"
import {
  primaryButton,
  secondaryButton,
} from "../../../components/buttonStyles"
import type { ProfileSchema } from "../../schemas/profile-form-schema"
import ProfileFields from "./ProfileFields"
import ProfilePreview from "./ProfilePreview"

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
  const headingRef = useRef<HTMLHeadingElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const keepEditingButtonRef = useRef<HTMLButtonElement>(null)
  const { isDirty } = useFormState<ProfileSchema>()
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)
  const publicUrl = publicUrlSegment
    ? `${window.location.origin}/${publicUrlSegment}`
    : undefined

  // Entering edit mode moves focus to the heading, so keyboard and screen
  // reader users start at the top of the form.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  // Warn before the tab is closed or reloaded with unsaved changes.
  useEffect(() => {
    if (!isDirty) {
      return
    }

    const warn = (event: BeforeUnloadEvent): void => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [isDirty])

  const requestCancel = (): void => {
    if (!isDirty) {
      onCancel()
      return
    }

    flushSync(() => setConfirmingDiscard(true))
    keepEditingButtonRef.current?.focus()
  }

  const keepEditing = (): void => {
    flushSync(() => setConfirmingDiscard(false))
    cancelButtonRef.current?.focus()
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-busy={isSaving}
      className="grid w-full items-start gap-14 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16"
    >
      <div className="grid min-w-0 gap-6">
        <div className="grid gap-4">
          <p className="m-0 flex items-center gap-3 font-cv-mono text-xs tracking-widest text-cv-copy uppercase">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-cv-accent"
            />
            Editing
          </p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="m-0 font-cv-display text-4xl font-semibold tracking-tighter outline-none"
          >
            Edit profile
          </h1>
        </div>
        {publicUrl && (
          <div className="grid gap-2">
            <p className="m-0 font-cv-mono text-xs tracking-wide text-cv-muted uppercase">
              Your CV link
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 text-cv-ink underline decoration-cv-accent/50 underline-offset-4 transition-colors wrap-anywhere hover:text-cv-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cv-accent"
              >
                {publicUrl.replace(/^https?:\/\//, "")}
              </a>
              <CopyLinkButton url={publicUrl} label="Copy link" />
            </div>
          </div>
        )}
        <ProfileFields isDisabled={isSaving} />
        {saveError && (
          <p role="alert" className="m-0 text-sm text-cv-danger">
            {saveError}
          </p>
        )}
        {/* Stays in view at the bottom of the screen while the form scrolls. */}
        <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 flex min-h-17 flex-wrap items-center gap-3 rounded-3xl border border-cv-line bg-cv-surface/85 p-3 shadow-cv-panel backdrop-blur-md">
          {confirmingDiscard ? (
            <>
              <p className="m-0 mr-auto px-2 text-sm text-cv-ink">
                Discard your unsaved changes?
              </p>
              <button
                ref={keepEditingButtonRef}
                type="button"
                onClick={keepEditing}
                className={primaryButton}
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={onCancel}
                className={secondaryButton}
              >
                Discard
              </button>
            </>
          ) : (
            <>
              <button
                type="submit"
                disabled={isSaving || !isDirty}
                className={primaryButton}
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={requestCancel}
                disabled={isSaving}
                className={secondaryButton}
              >
                Cancel
              </button>
              <p
                role="status"
                className="m-0 ml-auto flex items-center gap-2 px-2 font-cv-mono text-xs tracking-wide text-cv-muted uppercase"
              >
                <span
                  aria-hidden="true"
                  className={`size-2 rounded-full transition-colors ${isDirty ? "bg-cv-accent" : "bg-cv-line"}`}
                />
                {isDirty ? "Unsaved changes" : "No changes"}
              </p>
            </>
          )}
        </div>
      </div>
      <ProfilePreview />
    </form>
  )
}
