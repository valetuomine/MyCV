import {
  useEffect,
  useRef,
  useState,
  type JSX,
  type SubmitEventHandler,
} from "react"
import { flushSync } from "react-dom"
import { useFormState } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { ButtonVariant } from "../../../../types"
import Button from "../../../components/Button"
import CopyLinkButton from "../../../components/CopyLinkButton"
import type { ProfileSchema } from "../../schemas/profile-form-schema"
import ProfileFields from "./ProfileFields"
import ProfilePictureSection from "./ProfilePictureSection"
import ProfilePreview from "./ProfilePreview"

interface EditableProfileFormProps {
  onCancel: () => void
  onSubmit: SubmitEventHandler<HTMLFormElement>
  isSaving: boolean
  saveError?: string
  publicUrlSegment?: string
  profileId: string
  pictureUrl?: string | null
  savedFullName?: string | null
}

/**
 * The profile in edit mode: the fields, a live preview and the CV link, with
 * Save and Cancel in a bar that stays in view at the bottom of the screen
 * while the form scrolls. From `2xl` up the page widens for the edit view,
 * and the form column keeps the 45.6rem it has in the CV's 80rem container
 * (three fifths of what the 4rem gap leaves), so the extra width goes to the
 * preview. `ProfilePage` sizes the wider page from this column and the gap.
 *
 * Entering edit mode moves focus to the heading, so keyboard and screen
 * reader users start at the top of the form. With unsaved changes, the
 * browser warns before the tab is closed or reloaded, and Cancel asks before
 * discarding them. The profile picture comes before the fields, at every
 * width rather than in the preview, and is saved on its own, so Save and
 * Cancel leave it alone.
 *
 * @param props - The component props.
 * @param props.onCancel - Leaves edit mode without saving.
 * @param props.onSubmit - Validates and saves the form.
 * @param props.isSaving - Whether a save is in progress.
 * @param props.saveError - The message from a failed save.
 * @param props.publicUrlSegment - The CV's public URL segment, for its link.
 * @param props.profileId - The profile being edited, for its picture.
 * @param props.pictureUrl - The current picture's path from the API, if any.
 * @param props.savedFullName - The saved name, for the picture's initials.
 * @returns The edit form.
 */
export default function EditableProfileForm({
  onCancel,
  onSubmit,
  isSaving,
  saveError,
  publicUrlSegment,
  profileId,
  pictureUrl,
  savedFullName,
}: EditableProfileFormProps): JSX.Element {
  const { t } = useTranslation()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const keepEditingButtonRef = useRef<HTMLButtonElement>(null)
  const { isDirty } = useFormState<ProfileSchema>()
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)
  /** The CV's full public URL, once its segment is known. */
  const publicUrl = publicUrlSegment
    ? `${window.location.origin}/${publicUrlSegment}`
    : undefined

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!isDirty) {
      return
    }

    /**
     * Asks the browser to confirm leaving the page.
     *
     * @param event - The page's unload.
     */
    const warn = (event: BeforeUnloadEvent): void => {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [isDirty])

  /**
   * Leaves edit mode when nothing changed. Otherwise asks to discard the
   * changes and moves focus to Keep editing.
   */
  const requestCancel = (): void => {
    if (!isDirty) {
      onCancel()
      return
    }

    flushSync(() => setConfirmingDiscard(true))
    keepEditingButtonRef.current?.focus()
  }

  /** Closes the discard question and returns focus to Cancel. */
  const keepEditing = (): void => {
    flushSync(() => setConfirmingDiscard(false))
    cancelButtonRef.current?.focus()
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-busy={isSaving}
      className="group/edit grid w-full items-start gap-14 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16 2xl:grid-cols-[45.6rem_minmax(0,1fr)]"
    >
      <div className="grid min-w-0 gap-6">
        <div className="grid gap-4">
          <p className="m-0 flex items-center gap-3 font-cv-mono text-xs tracking-widest text-cv-copy uppercase">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-cv-accent"
            />
            {t("profileForm.editing")}
          </p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="m-0 font-cv-display text-4xl font-semibold tracking-tighter outline-none"
          >
            {t("profileForm.heading")}
          </h1>
        </div>
        {publicUrl && (
          <div className="grid gap-2">
            <p className="m-0 font-cv-mono text-xs tracking-wide text-cv-muted uppercase">
              {t("profileForm.cvLink")}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 text-cv-ink transition-colors duration-200 wrap-anywhere hover:text-cv-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cv-accent motion-safe:hover:[--underline:100%]"
              >
                <span className="bg-cv-underline pb-0.5 transition-[background-size] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)]">
                  {publicUrl.replace(/^https?:\/\//, "")}
                </span>
              </a>
              <CopyLinkButton
                url={publicUrl}
                label={t("profileForm.copyLink")}
              />
            </div>
          </div>
        )}
        <ProfilePictureSection
          profileId={profileId}
          pictureUrl={pictureUrl}
          fullName={savedFullName}
        />
        <ProfileFields isDisabled={isSaving} />
        {saveError && (
          <p role="alert" className="m-0 text-sm text-cv-danger">
            {saveError}
          </p>
        )}
        <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 flex min-h-17 flex-wrap items-center gap-3 rounded-3xl border border-cv-line bg-cv-surface/85 p-3 shadow-cv-panel backdrop-blur-md">
          {confirmingDiscard ? (
            <>
              <p className="m-0 mr-auto px-2 text-sm text-cv-ink">
                {t("profileForm.discardQuestion")}
              </p>
              <Button
                ref={keepEditingButtonRef}
                variant={ButtonVariant.Primary}
                onClick={keepEditing}
              >
                {t("profileForm.keepEditing")}
              </Button>
              <Button onClick={onCancel}>{t("profileForm.discard")}</Button>
            </>
          ) : (
            <>
              <Button
                type="submit"
                variant={ButtonVariant.Primary}
                loading={isSaving}
                loadingText={t("profileForm.saving")}
                disabled={!isDirty}
              >
                {t("profileForm.save")}
              </Button>
              <Button
                ref={cancelButtonRef}
                onClick={requestCancel}
                disabled={isSaving}
              >
                {t("common.cancel")}
              </Button>
              <p
                role="status"
                className="m-0 ml-auto flex items-center gap-2 px-2 font-cv-mono text-xs tracking-wide text-cv-muted uppercase"
              >
                <span
                  aria-hidden="true"
                  className={`size-2 rounded-full transition-colors ${isDirty ? "bg-cv-accent" : "bg-cv-line"}`}
                />
                {isDirty
                  ? t("profileForm.unsavedChanges")
                  : t("profileForm.noChanges")}
              </p>
            </>
          )}
        </div>
      </div>
      <ProfilePreview />
    </form>
  )
}
