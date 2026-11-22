import { skipToken } from "@reduxjs/toolkit/query"
import type { TFunction } from "i18next"
import { m as motion } from "framer-motion"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type SubmitEventHandler,
} from "react"
import { FormProvider, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  getLinkSignInResult,
  type LinkSignInResult,
} from "../../../../auth/signInLocationState"
import { useAuthSession } from "../../../../auth/authSession"
import useCanEditProfile from "../../../../auth/useCanEditProfile"
import { useGetOwnCandidateQuery } from "../../../../api/candidateQueries"
import {
  useGetProfileAdminQuery,
  useUpdateProfileMutation,
  type Profile,
} from "../../../../api/profileQueries"
import {
  profileLanguages,
  profileSchema,
  type ProfileSchema,
} from "../../schemas/profile-form-schema"
import {
  mapAdminProfileToForm,
  mapProfileToForm,
  toUpdateProfileRequest,
} from "../../mappers/profileFormMapper"
import { getProfileFormError } from "../../utils/profileFormUtils"
import type { LanguageCode } from "../../../../types"
import EditableProfileForm from "./EditableProfileForm"
import ProfileFormStatus from "./ProfileFormStatus"
import Notice from "../../../components/Notice"
import { revealItem, revealStagger } from "../../../components/reveal"
import ReadOnlyProfileForm from "./ReadOnlyProfileForm"
import SignInMethodsSection from "../SignInMethods/SignInMethodsSection"

interface ProfileFormProps {
  values: Profile
  pdfPath?: string
  fallbackLanguage?: LanguageCode
}

/** Why the last save failed: the profile had no ID, or the request failed. */
type SaveFailure =
  { reason: "missingId" } | { reason: "request"; error: unknown }

/**
 * Words a failed save.
 *
 * @param failure - Why the save failed.
 * @param t - The translation function.
 * @returns The message to show under the form.
 */
function describeSaveFailure(failure: SaveFailure, t: TFunction): string {
  return failure.reason === "missingId"
    ? t("profileForm.missingIdUpdate")
    : getProfileFormError(failure.error, t("formErrors.update"), t)
}

interface EditViewProps {
  adminQuery: ReturnType<typeof useGetProfileAdminQuery>
  profileId: Profile["id"]
  publicUrlSegment?: string
  linkResult: LinkSignInResult | null
  isSaving: boolean
  saveFailure: SaveFailure | null
  initialLanguage?: LanguageCode
  onSubmit: SubmitEventHandler<HTMLFormElement>
  onCancel: () => void
}

/**
 * The edit view: the form, with the owner's sign-in methods, once the admin
 * profile has loaded, otherwise its loading or error status. It renders only
 * while editing, so the CV view never builds its messages. Each of them
 * plays its own entrance when it mounts: the status fades in, and the form
 * and the sign-in methods rise in one after another (`revealStagger`), so
 * the fields that arrive with the admin profile never just appear.
 *
 * @param props - The component props.
 * @param props.adminQuery - The admin profile's query.
 * @param props.profileId - The profile's ID, missing for a profile that can't be edited.
 * @param props.publicUrlSegment - The CV's public URL segment, if known.
 * @param props.linkResult - How adding a sign-in method ended, when the view opened on the way back from it.
 * @param props.isSaving - Whether a save is in flight.
 * @param props.saveFailure - Why the last save failed, if it did.
 * @param props.initialLanguage - The language to edit first, if not the default.
 * @param props.onSubmit - Validates and saves the profile.
 * @param props.onCancel - Discards the changes and leaves edit mode.
 * @returns The edit form, or its loading or error status.
 */
function EditView({
  adminQuery,
  profileId,
  publicUrlSegment,
  linkResult,
  isSaving,
  saveFailure,
  initialLanguage,
  onSubmit,
  onCancel,
}: Readonly<EditViewProps>): JSX.Element {
  const { t } = useTranslation()
  const adminProfile = adminQuery.data
  /** The CV's public URL segment, from the access check or the admin profile. */
  const urlSegment =
    publicUrlSegment ?? adminProfile?.publicUrlSegment ?? undefined

  if (!adminProfile || !profileId) {
    /** Why loading the admin profile failed, if it did. */
    const adminLoadError = adminQuery.isError
      ? getProfileFormError(adminQuery.error, t("formErrors.details"), t)
      : undefined

    return (
      <motion.div variants={revealItem} initial="hidden" animate="visible">
        <ProfileFormStatus
          error={profileId ? adminLoadError : t("profileForm.missingIdEdit")}
          isLoading={adminQuery.isLoading}
          onCancel={onCancel}
        />
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={revealStagger}
      initial="hidden"
      animate="visible"
      className="grid gap-20"
    >
      <EditableProfileForm
        onCancel={onCancel}
        onSubmit={onSubmit}
        isSaving={isSaving}
        saveError={
          saveFailure ? describeSaveFailure(saveFailure, t) : undefined
        }
        publicUrlSegment={urlSegment}
        profileId={profileId}
        pictureUrl={adminProfile.pictureUrl}
        showPicture={adminProfile.showPicture !== false}
        canUseGooglePicture={adminProfile.canUseGooglePicture === true}
        savedFullName={adminProfile.fullName}
        initialLanguage={initialLanguage}
      />
      {adminProfile.isOwner && (
        <motion.div variants={revealItem}>
          <SignInMethodsSection
            publicUrlSegment={urlSegment}
            linkResult={linkResult}
          />
        </motion.div>
      )}
    </motion.div>
  )
}

/**
 * The CV with its edit mode. Users who may edit get an Edit profile action
 * that loads the full profile into the form, and a notice confirms each save.
 * One view shows at a time, and the swap is immediate: the outgoing view
 * leaves at once instead of fading, because a fading view would switch off
 * the blur of every Pane inside it, and the incoming view staggers its own
 * parts in. The CV plays its entrance on load and again when returning to
 * it; the edit view's fields fade themselves (`paneReveal` in `EditView`).
 * The edit view also lists the CV's sign-in methods, for its owner only:
 * a `CvAdmin` editing someone else's CV doesn't manage their sign-in. Returning from adding
 * one, the CV opens in the edit view with the outcome, and the router state
 * that carried it is dropped so a reload doesn't show it again. A failed
 * save is kept as its cause and worded at render, so its message follows a
 * language change. The edit view carries `data-edit-view`, which
 * `ProfilePage` reads to widen the page for it.
 *
 * The owner, and not a `CvAdmin` editing someone else's CV, sees a notice
 * in the CV view while the profile lacks a language version, unless they
 * chose Don't show again, which their own candidate record carries so it
 * holds on every device. The notice waits for both the access check's admin
 * profile and that record, so it never flashes before the choice is known.
 * Its close button hides it in this component's state, so it comes back on
 * the next page load but not after a round trip to the edit view, and its
 * add buttons open the edit view in that language.
 *
 * @param props - The component props.
 * @param props.values - The public profile.
 * @param props.pdfPath - The path of the CV's PDF view, for the CV's link to it.
 * @param props.fallbackLanguage - The language the CV fell back to, when it
 *   has no translation in the UI language.
 * @returns The CV or the edit form, with the saved notice.
 */
export default function ProfileForm({
  values,
  pdfPath,
  fallbackLanguage,
}: Readonly<ProfileFormProps>): JSX.Element {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  /** How adding a sign-in method ended, when the CV opened on the way back from it. */
  const [linkResult, setLinkResult] = useState(() =>
    getLinkSignInResult(location.state),
  )
  const [isEditing, setIsEditing] = useState(linkResult !== null)
  const { canEdit, publicUrlSegment, adminProfile, isRefreshing } =
    useCanEditProfile(values.id, isEditing)
  /**
   * Whether the access check has shown the user to be the owner. It stays
   * set while the check pauses, in the edit view or during a sign-in
   * renewal, so the owner's settings stay cached for the CV view, and
   * clears on signing out.
   */
  const [isKnownOwner, setIsKnownOwner] = useState(false)
  const { isSignedIn } = useAuthSession()
  if (adminProfile?.isOwner && !isKnownOwner) {
    setIsKnownOwner(true)
  } else if (!isSignedIn && isKnownOwner) {
    setIsKnownOwner(false)
  }
  /**
   * The owner's own settings, read in the background so that a refused
   * request never interrupts reading the CV.
   */
  const ownCandidateQuery = useGetOwnCandidateQuery(
    isKnownOwner ? { reportsRefusal: false } : skipToken,
  )
  const [isLanguageNoticeClosed, setIsLanguageNoticeClosed] = useState(false)
  /** Hides the missing-language notice until the next page load. */
  const closeLanguageNotice = useCallback(
    () => setIsLanguageNoticeClosed(true),
    [],
  )
  /** The language the edit view opens in, when the notice asked for one. */
  const [editLanguage, setEditLanguage] = useState<LanguageCode>()
  /**
   * The language versions the owner's CV lacks, while the notice about them
   * may show; empty otherwise, and while a refetch after a save may still
   * hold the old translations.
   */
  const missingLanguages =
    adminProfile?.isOwner &&
    !isRefreshing &&
    ownCandidateQuery.data?.hideMissingLanguageNotice === false &&
    !isLanguageNoticeClosed
      ? profileLanguages.filter(
          (code) =>
            !adminProfile.translations?.some(
              (translation) => translation.languageCode?.toLowerCase() === code,
            ),
        )
      : []
  /** After leaving edit mode, focus goes back to the Edit profile button. */
  const [hasEdited, setHasEdited] = useState(false)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)
  const dismissSavedNotice = useCallback(() => setSavedNotice(null), [])
  const [saveFailure, setSaveFailure] = useState<SaveFailure | null>(null)
  const [updateProfile, updateProfileState] = useUpdateProfileMutation()
  const profileAdminQuery = useGetProfileAdminQuery(
    isEditing && values.id ? { profileId: values.id } : skipToken,
  )

  /** The admin profile's form values once loaded, else the public profile's. */
  const formValues = useMemo(
    () =>
      profileAdminQuery.data
        ? mapAdminProfileToForm(profileAdminQuery.data)
        : mapProfileToForm(values),
    [profileAdminQuery.data, values],
  )

  /**
   * The edit form. Every field validates on each change, so a required field
   * shows its message as soon as it is emptied, before Save.
   */
  const profileForm = useForm<ProfileSchema>({
    resolver: zodResolver(profileSchema),
    values: formValues,
    mode: "onChange",
  })

  const { handleSubmit, reset } = profileForm

  useEffect(() => {
    if (getLinkSignInResult(location.state)) {
      void navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  /**
   * Validates and saves the profile, then leaves edit mode and shows the
   * saved notice. A new notice key restarts the notice when saves follow
   * each other quickly.
   */
  const saveProfile = handleSubmit(async (data) => {
    if (!values.id) {
      setSaveFailure({ reason: "missingId" })
      return
    }

    setSaveFailure(null)

    try {
      await updateProfile({
        profileId: values.id,
        body: toUpdateProfileRequest(data),
      }).unwrap()
      setIsEditing(false)
      setHasEdited(true)
      setLinkResult(null)
      setSavedNotice((current) => String(Number(current ?? 0) + 1))
    } catch (error: unknown) {
      setSaveFailure({ reason: "request", error })
    }
  })

  /** Discards the changes and leaves edit mode. */
  const cancelEditing = (): void => {
    reset(formValues)
    setSaveFailure(null)
    setIsEditing(false)
    setHasEdited(true)
    setLinkResult(null)
  }

  /**
   * Enters edit mode, which starts loading the admin profile.
   *
   * @param language - The language to edit first, or the default one when
   *   not given.
   */
  const startEditing = (language?: LanguageCode): void => {
    setSaveFailure(null)
    setEditLanguage(language)
    setIsEditing(true)
  }

  return (
    <FormProvider {...profileForm}>
      <div className="grid w-full gap-8">
        <div
          key={isEditing ? "edit" : "view"}
          data-edit-view={isEditing ? true : undefined}
        >
          {isEditing ? (
            <EditView
              adminQuery={profileAdminQuery}
              profileId={values.id}
              publicUrlSegment={publicUrlSegment}
              linkResult={linkResult}
              isSaving={updateProfileState.isLoading}
              saveFailure={saveFailure}
              initialLanguage={editLanguage}
              onSubmit={saveProfile}
              onCancel={cancelEditing}
            />
          ) : (
            <ReadOnlyProfileForm
              values={values}
              onEdit={canEdit ? startEditing : undefined}
              focusEdit={hasEdited}
              pdfPath={pdfPath}
              fallbackLanguage={fallbackLanguage}
              missingLanguages={missingLanguages}
              onCloseMissingLanguages={closeLanguageNotice}
            />
          )}
        </div>
      </div>
      <Notice noticeKey={savedNotice} onDismiss={dismissSavedNotice}>
        {t("profileForm.saved")}
      </Notice>
    </FormProvider>
  )
}
