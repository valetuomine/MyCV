import { skipToken } from "@reduxjs/toolkit/query"
import { AnimatePresence, m as motion, type Transition } from "framer-motion"
import { useCallback, useMemo, useState, type JSX } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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

interface ProfileFormProps {
  values: Profile
}

const viewTransition: Transition = {
  duration: 0.25,
  ease: [0.23, 1, 0.32, 1],
}

export default function ProfileForm({ values }: ProfileFormProps): JSX.Element {
  const { canEdit, publicUrlSegment } = useCanEditProfile(values.id)
  const [isEditing, setIsEditing] = useState(false)
  // After leaving edit mode, focus goes back to the Edit profile button.
  const [hasEdited, setHasEdited] = useState(false)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)
  const dismissSavedNotice = useCallback(() => setSavedNotice(null), [])
  const [saveError, setSaveError] = useState<string>()
  const [updateProfile, updateProfileState] = useUpdateProfileMutation()
  const profileAdminQuery = useGetProfileAdminQuery(
    isEditing && values.id ? values.id : skipToken,
  )

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

  const saveProfile = handleSubmit(async (data) => {
    if (!values.id) {
      setSaveError("Profile cannot be updated because its ID is missing.")
      return
    }

    setSaveError(undefined)

    try {
      await updateProfile({
        profileId: values.id,
        body: toUpdateProfileRequest(data),
      }).unwrap()
      setIsEditing(false)
      setHasEdited(true)
      // A new key restarts the notice when saves follow each other quickly.
      setSavedNotice((current) => String(Number(current ?? 0) + 1))
    } catch (error: unknown) {
      setSaveError(getProfileFormError(error, "Profile update"))
    }
  })

  const cancelEditing = (): void => {
    reset(formValues)
    setSaveError(undefined)
    setIsEditing(false)
    setHasEdited(true)
  }

  const startEditing = (): void => {
    setSaveError(undefined)
    setIsEditing(true)
  }

  const isError = !values.id
    ? "Profile cannot be edited because its ID is missing."
    : profileAdminQuery.isError
      ? getProfileFormError(profileAdminQuery.error, "Profile details")
      : undefined

  return (
    <FormProvider {...profileForm}>
      <div className="grid w-full gap-8">
        {/* One view at a time: the outgoing view leaves before the next one
            enters, and returning to the CV replays its entrance. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isEditing ? "edit" : "view"}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={viewTransition}
          >
            {isEditing ? (
              profileAdminQuery.data ? (
                <EditableProfileForm
                  onCancel={cancelEditing}
                  onSubmit={saveProfile}
                  isSaving={updateProfileState.isLoading}
                  saveError={saveError}
                  publicUrlSegment={publicUrlSegment}
                />
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
        Profile saved
      </Notice>
    </FormProvider>
  )
}
