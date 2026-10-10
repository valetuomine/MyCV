import { skipToken } from "@reduxjs/toolkit/query"
import { useMemo, useState, type JSX } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import useIsAdmin from "../../../../auth/useIsAdmin"
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
import ReadOnlyProfileForm from "./ReadOnlyProfileForm"

interface ProfileFormProps {
  values: Profile
  onEditingChange: (isEditing: boolean) => void
}

export default function ProfileForm({
  values,
  onEditingChange,
}: ProfileFormProps): JSX.Element {
  const hasAdminMode = useIsAdmin()
  const isAdmin = import.meta.env.DEV && hasAdminMode
  const [isEditing, setIsEditing] = useState(false)
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
      changeEditingState(false)
    } catch (error: unknown) {
      setSaveError(getProfileFormError(error, "Profile update"))
    }
  })

  const cancelEditing = (): void => {
    reset(formValues)
    setSaveError(undefined)
    changeEditingState(false)
  }

  const startEditing = (): void => {
    setSaveError(undefined)
    changeEditingState(true)
  }

  const changeEditingState = (editing: boolean): void => {
    setIsEditing(editing)
    onEditingChange(editing)
  }

  const isError = !values.id
    ? "Profile cannot be edited because its ID is missing."
    : profileAdminQuery.isError
      ? getProfileFormError(profileAdminQuery.error, "Profile details")
      : undefined

  return (
    <FormProvider {...profileForm}>
      <div className="grid w-full justify-items-start gap-8 sm:pl-[clamp(0rem,8vw,7rem)]">
        {isEditing ? (
          profileAdminQuery.data ? (
            <EditableProfileForm
              onCancel={cancelEditing}
              onSubmit={saveProfile}
              isSaving={updateProfileState.isLoading}
              saveError={saveError}
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
            onEdit={isAdmin ? startEditing : undefined}
          />
        )}
      </div>
    </FormProvider>
  )
}
