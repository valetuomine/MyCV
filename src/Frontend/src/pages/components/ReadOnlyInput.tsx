import type { JSX } from "react"

interface ReadOnlyInputProps {
  label: string
  value?: string | null
}

export default function ReadOnlyInput({
  label,
  value,
}: ReadOnlyInputProps): JSX.Element {
  return (
    <label className="grid gap-2 text-sm font-medium text-cv-ink">
      {label}
      <input
        value={value ?? ""}
        disabled
        className="min-h-11 min-w-0 rounded-lg border border-cv-field bg-cv-wash px-3.5 py-2.5 text-cv-muted"
      />
    </label>
  )
}
