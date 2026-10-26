import { skipToken } from "@reduxjs/toolkit/query"
import { AnimatePresence, m as motion, type Transition } from "framer-motion"
import { useCallback, useEffect, useMemo, useState, type JSX } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"
import { zodResolver } from "@hookform/resolvers/zod"
import { getLinkSignInResult } from "../../../../auth/signInLocationState"
import useCanEditProfile from "../../../../auth/useCanEditProfile"
import {
  useGetProfileAdminQuery,
  useUpdateProfileMutation,
  type Profile,
} from "../../../../api/profileQueries"
import {
  profileSchema,
  type ProfileSchema,
} from "../../schemas/profile-form-schema"
import {
  mapAdminProfileToForm,
  mapProfileToForm,
  toUpdateProfileRequest,
} from "../../mappers/profileFormMapper"
import { getProfileFormError } from "../../utils/profileFormUtils"
import EditableProfileForm from "./EditableProfileForm"
import ProfileFormStatus from "./ProfileFormStatus"
import Notice from "../../../components/Notice"
import ReadOnlyProfileForm from "./ReadOnlyProfileForm"
import SignInMethodsSection from "../SignInMethods/SignInMethodsSection"

interface ProfileFormProps {
  values: Profile
}

/** Why the last save failed: the profile had no ID, or the request failed. */
type SaveFailure =
  { reason: "missingId" } | { reason: "request"; error: unknown }

const viewTransition: Transition = {
  duration: 0.25,
  ease: [0.23, 1, 0.32, 1],
}

/**
 * The CV with its edit mode. Users who may edit get an Edit profile action
 * that loads the full profile into the form, and a notice confirms each save.
 * One view shows at a time: the outgoing view leaves before the next one
 * enters. The CV plays its entrance on load and again when returning to it.
 * The edit view also lists the CV's sign-in methods, for its owner only:
 * a `CvAdmin` editing someone else's CV doesn't manage their sign-in. Returning from adding
 * one, the CV opens in the edit view with the outcome, and the router state
 * that carried it is dropped so a reload doesn't show it again. A failed
 * save is kept as its cause and worded at render, so its message follows a
 * language change.
 *
 * @param props - The component props.
 * @param props.values - The public profile.
 * @returns The CV or the edit form, with the saved notice.
 */
export default function ProfileForm({ values }: ProfileFormProps): JSX.Element {
  const { t } = useTranslation()
  const { canEdit, publicUrlSegment } = useCanEditProfile(values.id)
  const location = useLocation()
  const navigate = useNavigate()
  /** How adding a sign-in method ended, when the CV opened on the way back from it. */
  const [linkResult, setLinkResult] = useState(() =>
    getLinkSignInResult(location.state),
  )
  const [isEditing, setIsEditing] = useState(linkResult !== null)
  /** After leaving edit mode, focus goes back to the Edit profile button. */
  const [hasEdited, setHasEdited] = useState(false)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)
  const dismissSavedNotice = useCallback(() => setSavedNotice(null), [])
  const [saveFailure, setSaveFailure] = useState<SaveFailure | null>(null)
  const [updateProfile, updateProfileState] = useUpdateProfileMutation()
  const profileAdminQuery = useGetProfileAdminQuery(
    isEditing && values.id ? values.id : skipToken,
  )

  /** The admin profile's form values once loaded, else the public profile's. */
  const formValues = useMemo(
    () =>
      profileAdminQuery.data
        ? mapAdminProfileToForm(profileAdminQuery.data)
        : mapProfileToForm(values),
    [profileAdminQuery.data, values],
  )

  const profileForm = useForm<ProfileSchema>({
    resolver: zodResolver(profileSchema),
    values: formValues,
  })

  const { handleSubmit, reset } = profileForm

  useEffect(() => {
    if (getLinkSignInResult(location.state)) {
      navigate(location.pathname, { replace: true, state: null })
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

  /** The failed save's message, in the active language. */
  const saveError =
    saveFailure === null
      ? undefined
      : saveFailure.reason === "missingId"
        ? t("profileForm.missingIdUpdate")
        : getProfileFormError(saveFailure.error, t("formErrors.update"), t)

  /** Discards the changes and leaves edit mode. */
  const cancelEditing = (): void => {
    reset(formValues)
    setSaveFailure(null)
    setIsEditing(false)
    setHasEdited(true)
    setLinkResult(null)
  }

  /** Enters edit mode, which starts loading the admin profile. */
  const startEditing = (): void => {
    setSaveFailure(null)
    setIsEditing(true)
  }

  /**
   * The view's rise-in, skipped on first load so only the CV's own entrance
   * plays. It is set here rather than as `initial={false}` on
   * `AnimatePresence`, which would block every entrance inside the CV.
   */
  const viewEntrance = isEditing || hasEdited ? { opacity: 0, y: 24 } : false

  /** Why the edit form can't open: a missing ID or a failed admin load. */
  const isError = !values.id
    ? t("profileForm.missingIdEdit")
    : profileAdminQuery.isError
      ? getProfileFormError(profileAdminQuery.error, t("formErrors.details"), t)
      : undefined

  return (
    <FormProvider {...profileForm}>
      <div className="grid w-full gap-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={isEditing ? "edit" : "view"}
            initial={viewEntrance}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={viewTransition}
          >
            {isEditing ? (
              profileAdminQuery.data ? (
                <div className="grid gap-20">
                  <EditableProfileForm
                    onCancel={cancelEditing}
                    onSubmit={saveProfile}
                    isSaving={updateProfileState.isLoading}
                    saveError={saveError}
                    publicUrlSegment={publicUrlSegment}
                  />
                  {profileAdminQuery.data.isOwner && (
                    <SignInMethodsSection
                      publicUrlSegment={
                        publicUrlSegment ??
                        profileAdminQuery.data.publicUrlSegment ??
                        undefined
                      }
                      linkResult={linkResult}
                    />
                  )}
                </div>
              ) : (
                <ProfileFormStatus
                  error={isError}
                  isLoading={profileAdminQuery.isLoading}
                  onCancel={cancelEditing}
                />
              )
            ) : (
              <ReadOnlyProfileForm
                values={values}
                onEdit={canEdit ? startEditing : undefined}
                focusEdit={hasEdited}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <Notice noticeKey={savedNotice} onDismiss={dismissSavedNotice}>
        {t("profileForm.saved")}
      </Notice>
    </FormProvider>
  )
}
