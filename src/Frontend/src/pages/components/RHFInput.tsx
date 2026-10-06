import { useId, type InputHTMLAttributes, type JSX } from "react"
import {
  useFormContext,
  useWatch,
  type FieldValues,
  type Path,
} from "react-hook-form"
import { InputType } from "../../types"

interface RHFInputProps<TFieldValues extends FieldValues>
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    | "aria-describedby"
    | "aria-invalid"
    | "className"
    | "defaultValue"
    | "id"
    | "name"
    | "onBlur"
    | "onChange"
    | "onKeyDown"
    | "type"
    | "value"
  > {
  name: Path<TFieldValues>
  label: string
  type?: InputType
  link?: boolean
  displayLabel?: string
  className?: string
  isEditing: boolean
}

export default function RHFInput<TFieldValues extends FieldValues>({
  name,
  label,
  type = InputType.Text,
  placeholder,
  disabled,
  required,
  link = false,
  displayLabel,
  className = "",
  isEditing,
  ...inputAttributes
}: RHFInputProps<TFieldValues>): JSX.Element {
  const inputId = useId()
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<TFieldValues>()

  const value = String(useWatch({ control, name }) ?? "")
  const error = errors[name]?.message as string | undefined
  const errorId = `${inputId}-error`
  const isContactLink = type === InputType.Email || type === InputType.Tel
  const href =
    type === InputType.Email
      ? `mailto:${value}`
      : type === InputType.Tel
        ? `tel:${value}`
        : /^https?:\/\//i.test(value)
          ? value
          : `https://${value}`
  const displayValue = displayLabel ?? value
  const { ref: inputRef, ...inputProps } = register(name)

  if (isEditing) {
    return (
      <div className="grid min-w-0 content-start gap-1.5">
        <label
          htmlFor={inputId}
          className="font-cv-sans text-sm font-medium text-cv-paper"
        >
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </label>
        <input
          {...inputAttributes}
          {...inputProps}
          id={inputId}
          ref={inputRef}
          type={type}
          placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="w-full min-w-0 rounded-md border border-cv-muted bg-cv-background px-3 py-2 text-cv-paper shadow-sm focus:outline-2 focus:outline-cv-accent disabled:cursor-not-allowed disabled:opacity-60"
        />
        {error && (
          <span id={errorId} role="alert" className="text-sm text-red-700">
            {error}
          </span>
        )}
      </div>
    )
  }

  return (
    <span className={`relative inline ${className}`}>
      {value &&
        (link ? (
          <a
            href={href}
            target={isContactLink ? undefined : "_blank"}
            rel={isContactLink ? undefined : "noreferrer"}
            className="text-inherit underline decoration-cv-accent/50 underline-offset-4 transition-colors hover:text-cv-accent"
          >
            {displayValue}
          </a>
        ) : (
          <span>{displayValue}</span>
        ))}
    </span>
  )
}
