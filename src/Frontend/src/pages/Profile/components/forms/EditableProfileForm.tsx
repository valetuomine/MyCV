import {
  useEffect,
  useRef,
  useState,
  type JSX,
  type SubmitEventHandler,
} from "react"
import { m as motion } from "framer-motion"
import { flushSync } from "react-dom"
import { useFormState } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { ButtonVariant, type LanguageCode } from "../../../../types"
import Button from "../../../components/Button"
import CopyLinkButton from "../../../components/CopyLinkButton"
import Eyebrow from "../../../components/Eyebrow"
import { labelClassName } from "../../../components/labelClassName"
import { revealItem, revealStagger } from "../../../components/reveal"
import type { ProfileSchema } from "../../schemas/profile-form-schema"
import FormLanguageProvider from "./FormLanguageProvider"
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
  showPicture: boolean
  canUseGooglePicture: boolean
  savedFullName?: string | null
  initialLanguage?: LanguageCode
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
 * Cancel leave it alone. The fields and the preview share the language
 * being edited through `FormLanguageProvider`, so the preview follows it.
 * The form's parts rise in one after another (`revealStagger`) when it
 * mounts, like the home page's; the fields and the preview fade only their
 * Panes and the pieces beside them (`paneReveal`), so their blur never
 * switches off, and the sticky actions bar, a Pane itself, fades on its own.
 *
 * @param props - The component props.
 * @param props.onCancel - Leaves edit mode without saving.
 * @param props.onSubmit - Validates and saves the form.
 * @param props.isSaving - Whether a save is in progress.
 * @param props.saveError - The message from a failed save.
 * @param props.publicUrlSegment - The CV's public URL segment, for its link.
 * @param props.profileId - The profile being edited, for its picture.
 * @param props.pictureUrl - The current picture's path from the API, if any.
 * @param props.showPicture - Whether the CV shows the picture section.
 * @param props.canUseGooglePicture - Whether Use Google picture is offered.
 * @param props.savedFullName - The saved name, for the picture's initials.
 * @param props.initialLanguage - The language to edit first, if not the default.
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
  showPicture,
  canUseGooglePicture,
  savedFullName,
  initialLanguage,
}: Readonly<EditableProfileFormProps>): JSX.Element {
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
    <motion.form
      variants={revealStagger}
      onSubmit={onSubmit}
      noValidate
      aria-busy={isSaving}
      className="group/edit grid w-full items-start gap-14 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16 2xl:grid-cols-[45.6rem_minmax(0,1fr)]"
    >
      <FormLanguageProvider initialLanguage={initialLanguage}>
        <div className="grid min-w-0 gap-6">
          <motion.div variants={revealItem} className="grid gap-4">
            <Eyebrow>{t("profileForm.editing")}</Eyebrow>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="m-0 min-w-0 font-cv-display text-4xl font-semibold tracking-tighter wrap-break-word outline-none"
            >
              {t("profileForm.heading")}
            </h1>
          </motion.div>
          {publicUrl && (
            <motion.div variants={revealItem} className="grid gap-2">
              <p className={`m-0 ${labelClassName}`}>
                {t("profileForm.cvLink")}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group/cv-link min-w-0 text-cv-ink transition-colors duration-200 wrap-anywhere hover:text-cv-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cv-accent motion-safe:hover:[--underline:100%]"
                >
                  <span className="bg-cv-underline pb-0.5 transition-[background-size,filter] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)] not-print:not-forced-colors:group-hover/cv-link:drop-shadow-cv-edge-hover not-print:not-forced-colors:group-focus-visible/cv-link:drop-shadow-cv-edge-focus motion-reduce:transition-none">
                    {publicUrl.replace(/^https?:\/\//, "")}
                  </span>
                </a>
                <CopyLinkButton
                  url={publicUrl}
                  label={t("profileForm.copyLink")}
                />
              </div>
            </motion.div>
          )}
          <motion.div variants={revealItem} className="grid min-w-0">
            <ProfilePictureSection
              profileId={profileId}
              pictureUrl={pictureUrl}
              showPicture={showPicture}
              canUseGooglePicture={canUseGooglePicture}
              fullName={savedFullName}
            />
          </motion.div>
          <ProfileFields isDisabled={isSaving} />
          {saveError && (
            <p role="alert" className="m-0 text-sm text-cv-danger">
              {saveError}
            </p>
          )}
          <motion.div
            variants={revealItem}
            className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 flex min-h-17 flex-wrap items-center gap-3 rounded-3xl border border-cv-line bg-cv-pane bg-cv-pane-dense p-3 shadow-cv-panel inset-shadow-cv-rim"
          >
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
                <output className="m-0 ml-auto flex items-center gap-2 px-2 font-cv-mono text-xs tracking-wide text-cv-copy uppercase">
                  <span
                    aria-hidden="true"
                    className={`size-2 rounded-full transition-colors ${isDirty ? "bg-cv-accent" : "bg-cv-line"}`}
                  />
                  {isDirty
                    ? t("profileForm.unsavedChanges")
                    : t("profileForm.noChanges")}
                </output>
              </>
            )}
          </motion.div>
        </div>
        <ProfilePreview />
      </FormLanguageProvider>
    </motion.form>
  )
}
