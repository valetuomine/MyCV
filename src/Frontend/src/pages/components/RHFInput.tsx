import { useEffect, useId, useState, type JSX } from "react"
import {
  useFormContext,
  useWatch,
  type FieldValues,
  type Path,
} from "react-hook-form"
import useIsAdmin from "../../auth/useIsAdmin"

interface RHFInputProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>
  label: string
  type?: "text" | "email" | "tel" | "url"
  placeholder?: string
  link?: boolean
  displayLabel?: string
  className?: string
  editIconSize?: "small" | "large"
}

export default function RHFInput<TFieldValues extends FieldValues>({
  name,
  label,
  type = "text",
  placeholder,
  link = false,
  displayLabel,
  className = "",
  editIconSize = "small",
}: RHFInputProps<TFieldValues>): JSX.Element {
  const isAdmin = useIsAdmin()
  const inputId = useId()
  const [isEditing, setIsEditing] = useState(false)
  const {
    control,
    register,
    setFocus,
    trigger,
    formState: { errors },
  } = useFormContext<TFieldValues>()
  const value = String(useWatch({ control, name }) ?? "")
  const error = errors[name]?.message as string | undefined
  const href =
    type === "email"
      ? `mailto:${value}`
      : type === "tel"
        ? `tel:${value}`
        : /^https?:\/\//i.test(value)
          ? value
          : `https://${value}`
  const displayValue = displayLabel ?? value
  const { ref: inputRef, ...inputProps } = register(name)

  useEffect(() => {
    if (isEditing) setFocus(name)
  }, [isEditing, name, setFocus])

  const closeEditor = async (): Promise<void> => {
    if (await trigger(name)) setIsEditing(false)
  }

  return (
    <span
      className={`${isEditing ? `relative inline-flex max-w-full flex-col items-center gap-3 ${className}` : `relative inline ${className}`}`}
    >
      {isEditing ? (
        <>
          <label htmlFor={inputId} className="sr-only">
            {label}
          </label>
          <input
            {...inputProps}
            id={inputId}
            ref={inputRef}
            type={type}
            placeholder={placeholder ?? `Add ${label.toLowerCase()}`}
            aria-invalid={error ? true : undefined}
            className="w-auto min-w-0 max-w-full rounded-md border-b border-cv-muted bg-white px-4 py-1.5 text-inherit [field-sizing:content] shadow-md shadow-black/10 focus:outline-2 focus:outline-cv-accent"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void closeEditor()
              }
              if (event.key === "Escape") setIsEditing(false)
            }}
          />
          <button
            type="button"
            aria-label={`Finish editing ${label}`}
            title="Done"
            onClick={() => void closeEditor()}
            className="rounded border border-cv-paper bg-cv-paper px-5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white hover:text-cv-paper focus-visible:outline-2 focus-visible:outline-cv-accent"
          >
            Done
          </button>
          {error && (
            <span
              role="alert"
              className="absolute top-full left-0 z-20 mt-1 whitespace-nowrap text-sm text-red-300"
            >
              {error}
            </span>
          )}
        </>
      ) : (
        <>
          {value ? (
            link ? (
              <a
                href={href}
                target={
                  type === "email" || type === "tel" ? undefined : "_blank"
                }
                rel={
                  type === "email" || type === "tel" ? undefined : "noreferrer"
                }
                className="text-inherit underline decoration-cv-accent/50 underline-offset-4 transition-colors hover:text-cv-accent"
              >
                {displayValue}
              </a>
            ) : (
              <span>{displayValue}</span>
            )
          ) : (
            isAdmin && (
              <span className="text-sm text-cv-meta">
                Add {label.toLowerCase()}
              </span>
            )
          )}
          {isAdmin && (
            <button
              type="button"
              aria-label={`${value ? "Edit" : "Add"} ${label}`}
              title={`${value ? "Edit" : "Add"} ${label}`}
              onClick={() => setIsEditing(true)}
              className={`ml-1 inline-flex shrink-0 items-center justify-center rounded align-middle text-cv-muted opacity-70 transition-colors hover:bg-black/5 hover:text-cv-paper hover:opacity-100 focus-visible:bg-black/5 focus-visible:text-cv-paper focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-cv-accent ${
                editIconSize === "large" ? "size-8 p-1.5" : "size-6 p-1"
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className={editIconSize === "large" ? "size-5" : "size-4"}
              >
                <path
                  d="m13.75 3.75 2.5 2.5M3.75 16.25l3.25-.75 9-9a1.77 1.77 0 0 0-2.5-2.5l-9 9-.75 3.25Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
          )}
        </>
      )}
    </span>
  )
}
