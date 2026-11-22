import type { TFunction } from "i18next"
import { useId, useRef, useState, type ChangeEvent, type JSX } from "react"
import { flushSync } from "react-dom"
import { useTranslation } from "react-i18next"
import {
  useDeleteProfilePictureMutation,
  useGetProfilePicturePreviewQuery,
  useSaveGoogleProfilePictureMutation,
  useSaveProfilePictureMutation,
  useSetProfilePictureVisibilityMutation,
} from "../../../../api/profileQueries"
import { ButtonSize, ButtonVariant } from "../../../../types"
import Button from "../../../components/Button"
import { headingClassName } from "../../../components/headingClassName"
import { labelClassName } from "../../../components/labelClassName"
import { maxPictureBytes, preparePicture } from "../../utils/preparePicture"
import {
  getInitials,
  getProfilePictureError,
  type PictureChange,
} from "../../utils/profileFormUtils"
import PictureVisibilitySwitch from "./PictureVisibilitySwitch"

interface ProfilePictureSectionProps {
  profileId: string
  pictureUrl?: string | null
  showPicture: boolean
  canUseGooglePicture: boolean
  fullName?: string | null
}

/**
 * How the last picture change ended. A failure keeps its cause and is worded
 * at render, so its message follows a language change. A visibility change
 * keeps the value it saved, for its confirmation.
 */
interface PictureOutcome {
  change: PictureChange
  error: unknown
  isError: boolean
  isVisible?: boolean
}

/**
 * Picks the change under way. Only one runs at a time, because each blocks
 * the others, so the order only settles which one wins.
 *
 * @param busy - Whether each change is under way.
 * @returns The change under way, or null when none is.
 */
function firstBusyChange(
  busy: Record<PictureChange, boolean>,
): PictureChange | null {
  if (busy.upload) {
    return "upload"
  }

  if (busy.google) {
    return "google"
  }

  if (busy.remove) {
    return "remove"
  }

  return busy.visibility ? "visibility" : null
}

/**
 * Words how the last picture change ended.
 *
 * @param outcome - How the change ended.
 * @param t - The translation function.
 * @returns The failure's message, or the confirmation of the saved, removed, shown or hidden picture.
 */
function describeOutcome(outcome: PictureOutcome, t: TFunction): string {
  if (outcome.isError) {
    return getProfilePictureError(outcome.error, outcome.change, t)
  }

  if (outcome.change === "visibility") {
    return outcome.isVisible
      ? t("profilePicture.shown")
      : t("profilePicture.hidden")
  }

  return outcome.change === "remove"
    ? t("profilePicture.removed")
    : t("profilePicture.saved")
}

/**
 * The edit view's profile picture: a preview, or the initials when there is
 * none, with Choose or Change picture, Use Google picture when the API says
 * the CV has one (the Google sign-in's own picture, or in a Microsoft sign-in
 * that of a linked Google sign-in), and Remove picture, which asks first.
 * Each change is saved at once through its own request, apart from the
 * form's Save and Cancel, and leaves the form's unsaved changes as they are,
 * which the section says.
 * Choosing a picture opens the device's picker, which on a phone also offers
 * the camera; the browser shrinks the photo before uploading it. Its outcome
 * shows below the actions, and after a removal focus moves to Choose picture,
 * because Remove is gone. The Show profile picture on CV switch hides or
 * shows the whole section on the CV and its PDF, also saved at once; while it
 * saves, it shows the value asked for, which the mutation writes into the
 * cached admin view (`setProfilePictureVisibility`). A hidden section keeps
 * its picture, which the preview dims under a Hidden from CV badge, and
 * uploading or using the Google picture leaves the switch as it is. The
 * preview is fetched signed in, because the public picture URL is not found
 * while hidden, and its frame stays empty while it loads.
 *
 * @param props - The component props.
 * @param props.profileId - The profile whose picture this is.
 * @param props.pictureUrl - The current picture's path from the API, if any.
 * @param props.showPicture - Whether the CV shows the picture section.
 * @param props.canUseGooglePicture - Whether the API can fetch a Google picture for this sign-in.
 * @param props.fullName - The saved name, for the initials without a picture.
 * @returns The section.
 */
export default function ProfilePictureSection({
  profileId,
  pictureUrl,
  showPicture,
  canUseGooglePicture,
  fullName,
}: Readonly<ProfilePictureSectionProps>): JSX.Element {
  const { t } = useTranslation()
  const headingId = useId()
  const hintId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const chooseButtonRef = useRef<HTMLButtonElement>(null)
  const removeButtonRef = useRef<HTMLButtonElement>(null)
  const keepButtonRef = useRef<HTMLButtonElement>(null)
  const [saveProfilePicture, uploadState] = useSaveProfilePictureMutation()
  const [saveGoogleProfilePicture, googleState] =
    useSaveGoogleProfilePictureMutation()
  const [deleteProfilePicture, removeState] = useDeleteProfilePictureMutation()
  const [setProfilePictureVisibility, visibilityState] =
    useSetProfilePictureVisibilityMutation()
  const [isPreparing, setIsPreparing] = useState(false)
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)
  const [outcome, setOutcome] = useState<PictureOutcome | null>(null)
  const [failedPreviewUrl, setFailedPreviewUrl] = useState<string | null>(null)
  const preview = useGetProfilePicturePreviewQuery(
    { profileId, pictureUrl: pictureUrl ?? "" },
    { skip: !pictureUrl },
  )
  /** The loaded preview's object URL, kept only while it belongs to the current picture. */
  const previewUrl = pictureUrl ? preview.currentData : undefined
  /** Shows the preview unless there is none or it failed to load. */
  const showPreview = Boolean(previewUrl && failedPreviewUrl !== previewUrl)
  /** Leaves the frame empty while the preview loads, instead of flashing the initials. */
  const isPreviewLoading = Boolean(pictureUrl) && preview.isFetching
  /** The change under way, which blocks the others. */
  const busyChange = firstBusyChange({
    upload: isPreparing || uploadState.isLoading,
    google: googleState.isLoading,
    remove: removeState.isLoading,
    visibility: visibilityState.isLoading,
  })
  /**
   * Runs a change and records how it ended.
   *
   * @param change - Which change this is.
   * @param run - Sends the change; rejects when it fails.
   * @param isVisible - The visibility a visibility change saves.
   * @returns Whether the change succeeded.
   */
  const runChange = async (
    change: PictureChange,
    run: () => Promise<unknown>,
    isVisible?: boolean,
  ): Promise<boolean> => {
    setOutcome(null)
    try {
      await run()
      setOutcome({ change, error: null, isError: false, isVisible })
      return true
    } catch (error: unknown) {
      setOutcome({ change, error, isError: true, isVisible })
      return false
    }
  }

  /**
   * Saves whether the CV shows the picture section.
   *
   * @param isVisible - Whether to show it.
   */
  const changeVisibility = (isVisible: boolean): void => {
    setIsConfirmingRemove(false)
    void runChange(
      "visibility",
      () =>
        setProfilePictureVisibility({
          profileId,
          body: { isVisible },
        }).unwrap(),
      isVisible,
    )
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
  const outcomeText = outcome ? describeOutcome(outcome, t) : null

  return (
    <section
      aria-labelledby={headingId}
      className="grid gap-5 border-y border-cv-line py-6"
    >
      <h2
        id={headingId}
        className={`${headingClassName} flex flex-wrap items-baseline gap-x-3 gap-y-1`}
      >
        {t("profilePicture.heading")}
        <span className={labelClassName}>
          {t("profilePicture.savedAtOnce")}
        </span>
      </h2>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
        <div className="relative h-32 w-26 shrink-0 overflow-hidden rounded-3xl border border-cv-line bg-cv-surface">
          <div
            className={`size-full transition-opacity duration-200 motion-reduce:transition-none ${showPicture ? "" : "opacity-40 grayscale"}`}
          >
            {showPreview && (
              <img
                key={previewUrl}
                src={previewUrl}
                alt={t("profilePicture.current")}
                onError={() => setFailedPreviewUrl(previewUrl ?? null)}
                className="size-full object-cover"
              />
            )}
            {!showPreview && !isPreviewLoading && (
              <div
                aria-hidden="true"
                className="grid size-full place-items-center bg-linear-to-br from-cv-accent/20 via-transparent to-transparent font-cv-profile text-3xl font-semibold tracking-tighter text-cv-accent select-none"
              >
                {getInitials(fullName)}
              </div>
            )}
          </div>
          {!showPicture && (
            <span className="absolute inset-x-1 bottom-1.5 rounded-full border border-cv-line bg-cv-surface px-1.5 py-1 text-center text-[0.6875rem] leading-tight font-medium whitespace-nowrap text-cv-ink">
              {t("profilePicture.hiddenBadge")}
            </span>
          )}
        </div>
        <div className="grid min-w-0 flex-1 basis-64 content-start gap-3">
          <p
            id={hintId}
            className="m-0 max-w-[56ch] text-sm text-pretty text-cv-copy"
          >
            {!showPreview && !isPreviewLoading && showPicture && (
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
              {canUseGooglePicture && (
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
          <div className="mt-2 border-t border-cv-line pt-4">
            <PictureVisibilitySwitch
              checked={showPicture}
              busy={busyChange === "visibility"}
              disabled={busyChange !== null && busyChange !== "visibility"}
              onChange={changeVisibility}
            />
          </div>
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
        <output
          role={outcome.isError ? "alert" : undefined}
          className={`m-0 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${outcome.isError ? "border-cv-danger text-cv-danger" : "border-cv-line text-cv-ink"}`}
        >
          <span
            aria-hidden="true"
            className={`mt-1.5 size-2 shrink-0 rounded-full ${outcome.isError ? "bg-cv-danger" : "bg-cv-accent"}`}
          />
          {outcomeText}
        </output>
      )}
    </section>
  )
}
