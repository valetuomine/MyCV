import { useId, useRef, useState, type ChangeEvent, type JSX } from "react"
import { flushSync } from "react-dom"
import { useTranslation } from "react-i18next"
import {
  getProfilePictureUrl,
  useDeleteProfilePictureMutation,
  useSaveGoogleProfilePictureMutation,
  useSaveProfilePictureMutation,
} from "../../../../api/profileQueries"
import { useAuthSession } from "../../../../auth/authSession"
import { ButtonSize, ButtonVariant, SignInMethod } from "../../../../types"
import Button from "../../../components/Button"
import { maxPictureBytes, preparePicture } from "../../utils/preparePicture"
import {
  getInitials,
  getProfilePictureError,
  type PictureChange,
} from "../../utils/profileFormUtils"

interface ProfilePictureSectionProps {
  profileId: string
  pictureUrl?: string | null
  fullName?: string | null
}

/**
 * How the last picture change ended. A failure keeps its cause and is worded
 * at render, so its message follows a language change.
 */
interface PictureOutcome {
  change: PictureChange
  error: unknown
  isError: boolean
}

/**
 * The edit view's profile picture: a preview, or the initials when there is
 * none, with Choose or Change picture, Use Google picture for a Google
 * sign-in only, and Remove picture, which asks first. Each change is saved
 * at once through its own request, apart from the form's Save and Cancel,
 * and leaves the form's unsaved changes as they are, which the section says.
 * Choosing a picture opens the device's picker, which on a phone also offers
 * the camera; the browser shrinks the photo before uploading it. Its outcome
 * shows below the actions, and after a removal focus moves to Choose picture,
 * because Remove is gone.
 *
 * @param props - The component props.
 * @param props.profileId - The profile whose picture this is.
 * @param props.pictureUrl - The current picture's path from the API, if any.
 * @param props.fullName - The saved name, for the initials without a picture.
 * @returns The section.
 */
export default function ProfilePictureSection({
  profileId,
  pictureUrl,
  fullName,
}: ProfilePictureSectionProps): JSX.Element {
  const { t } = useTranslation()
  const headingId = useId()
  const hintId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const chooseButtonRef = useRef<HTMLButtonElement>(null)
  const removeButtonRef = useRef<HTMLButtonElement>(null)
  const keepButtonRef = useRef<HTMLButtonElement>(null)
  const session = useAuthSession()
  const [saveProfilePicture, uploadState] = useSaveProfilePictureMutation()
  const [saveGoogleProfilePicture, googleState] =
    useSaveGoogleProfilePictureMutation()
  const [deleteProfilePicture, removeState] = useDeleteProfilePictureMutation()
  const [isPreparing, setIsPreparing] = useState(false)
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)
  const [outcome, setOutcome] = useState<PictureOutcome | null>(null)
  const [failedPreviewUrl, setFailedPreviewUrl] = useState<string | null>(null)
  const previewUrl = getProfilePictureUrl(pictureUrl)
  /** Shows the preview unless there is none or it failed to load. */
  const showPreview = Boolean(previewUrl) && failedPreviewUrl !== previewUrl
  /** The change under way, which blocks the others. */
  const busyChange: PictureChange | null =
    isPreparing || uploadState.isLoading
      ? "upload"
      : googleState.isLoading
        ? "google"
        : removeState.isLoading
          ? "remove"
          : null
  /** Whether the session is a Google sign-in, which alone has a Google picture. */
  const canUseGoogle = session.method === SignInMethod.Google

  /**
   * Runs a change and records how it ended.
   *
   * @param change - Which change this is.
   * @param run - Sends the change; rejects when it fails.
   * @returns Whether the change succeeded.
   */
  const runChange = async (
    change: PictureChange,
    run: () => Promise<unknown>,
  ): Promise<boolean> => {
    setOutcome(null)
    try {
      await run()
      setOutcome({ change, error: null, isError: false })
      return true
    } catch (error: unknown) {
      setOutcome({ change, error, isError: true })
      return false
    }
  }

  /** Opens the device's file picker, which offers the camera on a phone. */
  const choosePicture = (): void => {
    inputRef.current?.click()
  }

  /**
   * Shrinks the chosen file and uploads it. The input is cleared, so the
   * same file can be chosen again. A file the browser couldn't shrink is
   * sent as it is, unless it is over the API's limit anyway.
   *
   * @param event - The file input's change.
   */
  const uploadPicture = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) {
      return
    }

    setIsConfirmingRemove(false)
    setOutcome(null)
    setIsPreparing(true)
    const picture = await preparePicture(file)
    setIsPreparing(false)
    if (picture.blob.size > maxPictureBytes) {
      setOutcome({ change: "upload", error: { status: 413 }, isError: true })
      return
    }

    await runChange("upload", () =>
      saveProfilePicture({
        profileId,
        picture: picture.blob,
        fileName: picture.fileName,
      }).unwrap(),
    )
  }

  /** Saves the Google account's picture as the profile picture. */
  const applyGooglePicture = (): void => {
    setIsConfirmingRemove(false)
    void runChange("google", () => saveGoogleProfilePicture(profileId).unwrap())
  }

  /** Asks to confirm the removal and moves focus to Keep. */
  const requestRemove = (): void => {
    setOutcome(null)
    flushSync(() => setIsConfirmingRemove(true))
    keepButtonRef.current?.focus()
  }

  /** Closes the question and returns focus to Remove picture. */
  const keepPicture = (): void => {
    flushSync(() => setIsConfirmingRemove(false))
    removeButtonRef.current?.focus()
  }

  /** Removes the picture, then moves focus to Choose picture. */
  const removePicture = async (): Promise<void> => {
    const removed = await runChange("remove", () =>
      deleteProfilePicture(profileId).unwrap(),
    )
    flushSync(() => setIsConfirmingRemove(false))
    if (removed) {
      chooseButtonRef.current?.focus()
    } else {
      removeButtonRef.current?.focus()
    }
  }

  /** The outcome's message in the active language. */
  const outcomeText = outcome
    ? outcome.isError
      ? getProfilePictureError(outcome.error, outcome.change, t)
      : outcome.change === "remove"
        ? t("profilePicture.removed")
        : t("profilePicture.saved")
    : null

  return (
    <section
      aria-labelledby={headingId}
      className="grid gap-5 border-y border-cv-line py-6"
    >
      <h2
        id={headingId}
        className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-cv-display text-xl font-semibold tracking-tight text-cv-ink"
      >
        {t("profilePicture.heading")}
        <span className="font-cv-mono text-xs font-normal tracking-wide text-cv-muted uppercase">
          {t("profilePicture.savedAtOnce")}
        </span>
      </h2>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
        <div className="relative h-32 w-26 shrink-0 overflow-hidden rounded-3xl border border-cv-line bg-cv-surface">
          {showPreview ? (
            <img
              key={previewUrl}
              src={previewUrl}
              alt={t("profilePicture.current")}
              onError={() => setFailedPreviewUrl(previewUrl ?? null)}
              className="size-full object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="grid size-full place-items-center bg-linear-to-br from-cv-accent/20 via-transparent to-transparent font-cv-display text-3xl font-semibold tracking-tighter text-cv-accent select-none"
            >
              {getInitials(fullName)}
            </div>
          )}
        </div>
        <div className="grid min-w-0 flex-1 basis-64 content-start gap-3">
          <p
            id={hintId}
            className="m-0 max-w-[56ch] text-sm text-pretty text-cv-copy"
          >
            {!showPreview && (
              <span className="block text-cv-ink">
                {t("profilePicture.none")}
              </span>
            )}
            {t("profilePicture.hint")}
          </p>
          {isConfirmingRemove ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-cv-ink">
                {t("profilePicture.removeQuestion")}
              </span>
              <Button
                variant={ButtonVariant.Danger}
                size={ButtonSize.Small}
                onClick={() => void removePicture()}
                loading={busyChange === "remove"}
                loadingText={t("profilePicture.removing")}
              >
                {t("profilePicture.confirmRemove")}
              </Button>
              <Button
                ref={keepButtonRef}
                size={ButtonSize.Small}
                onClick={keepPicture}
                disabled={busyChange === "remove"}
              >
                {t("profilePicture.keep")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                ref={chooseButtonRef}
                size={ButtonSize.Small}
                onClick={choosePicture}
                loading={busyChange === "upload"}
                loadingText={t("profilePicture.uploading")}
                disabled={busyChange !== null && busyChange !== "upload"}
                aria-describedby={hintId}
              >
                {showPreview
                  ? t("profilePicture.change")
                  : t("profilePicture.choose")}
              </Button>
              {canUseGoogle && (
                <Button
                  size={ButtonSize.Small}
                  onClick={applyGooglePicture}
                  loading={busyChange === "google"}
                  loadingText={t("profilePicture.fetchingGoogle")}
                  disabled={busyChange !== null && busyChange !== "google"}
                  aria-describedby={hintId}
                >
                  {t("profilePicture.useGoogle")}
                </Button>
              )}
              {pictureUrl && (
                <Button
                  ref={removeButtonRef}
                  size={ButtonSize.Small}
                  onClick={requestRemove}
                  disabled={busyChange !== null}
                >
                  {t("profilePicture.remove")}
                </Button>
              )}
            </div>
          )}
          <p className="m-0 text-xs text-cv-muted">
            {t("profilePicture.formats")}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => void uploadPicture(event)}
          />
        </div>
      </div>
      {outcome && outcomeText && (
        <p
          role={outcome.isError ? "alert" : "status"}
          className={`m-0 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${outcome.isError ? "border-cv-danger text-cv-danger" : "border-cv-line text-cv-ink"}`}
        >
          <span
            aria-hidden="true"
            className={`mt-1.5 size-2 shrink-0 rounded-full ${outcome.isError ? "bg-cv-danger" : "bg-cv-accent"}`}
          />
          {outcomeText}
        </p>
      )}
    </section>
  )
}
