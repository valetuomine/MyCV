import type { JSX } from "react"
import { secondaryButton } from "../../../components/buttonStyles"

interface ProfileFormStatusProps {
  error?: string
  isLoading: boolean
  onCancel: () => void
}

export default function ProfileFormStatus({
  error,
  isLoading,
  onCancel,
}: ProfileFormStatusProps): JSX.Element {
  return (
    <div className="grid gap-3" aria-busy={isLoading}>
      <p
        role={error ? "alert" : "status"}
        className={error ? "text-cv-danger" : "text-cv-copy"}
      >
        {error ?? "Loading profile details…"}
      </p>
      <button type="button" onClick={onCancel} className={`${secondaryButton} w-fit`}>
        Cancel
      </button>
    </div>
  )
}
