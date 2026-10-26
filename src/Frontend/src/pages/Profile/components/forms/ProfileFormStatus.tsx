import type { JSX } from "react"
import { useTranslation } from "react-i18next"
import Button from "../../../components/Button"

interface ProfileFormStatusProps {
  error?: string
  isLoading: boolean
  onCancel: () => void
}

/**
 * Stands in for the edit form while the admin profile loads, or explains why
 * it can't open, with a way back to the CV.
 *
 * @param props - The component props.
 * @param props.error - Why the form can't open; without it, loading shows.
 * @param props.isLoading - Whether the admin profile is loading.
 * @param props.onCancel - Returns to the CV.
 * @returns The loading or error message with a Cancel button.
 */
export default function ProfileFormStatus({
  error,
  isLoading,
  onCancel,
}: ProfileFormStatusProps): JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="grid gap-3" aria-busy={isLoading}>
      <p
        role={error ? "alert" : "status"}
        className={error ? "text-cv-danger" : "text-cv-copy"}
      >
        {error ?? t("profileForm.loadingDetails")}
      </p>
      <Button onClick={onCancel} className="w-fit">
        {t("common.cancel")}
      </Button>
    </div>
  )
}
