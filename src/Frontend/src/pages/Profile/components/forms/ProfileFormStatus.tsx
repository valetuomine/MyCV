import type { JSX } from "react"

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
      <p role={error ? "alert" : "status"}>
        {error ?? "Loading profile details…"}
      </p>
      <button
        type="button"
        onClick={onCancel}
        className="w-fit rounded border border-cv-muted bg-transparent px-5 py-2 text-sm font-medium text-cv-paper transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-cv-accent"
      >
        Cancel
      </button>
    </div>
  )
}
