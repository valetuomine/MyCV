import { useId, type InputHTMLAttributes, type JSX } from "react"
import {
  useFormContext,
  useWatch,
  type FieldValues,
  type Path,
} from "react-hook-form"
import { InputType } from "../../types"

interface RHFInputProps<TFieldValues extends FieldValues> extends Omit<
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
  multiline?: boolean
  displayLabel?: string
  className?: string
  linkClassName?: string
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
  multiline = false,
  displayLabel,
  className = "",
  linkClassName = "text-inherit underline decoration-cv-accent/50 underline-offset-4 transition-colors hover:text-cv-accent",
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
    const fieldClassName =
      "w-full min-w-0 rounded-lg border border-cv-field bg-cv-wash px-3.5 py-2.5 text-cv-ink transition-colors outline-none placeholder:text-cv-meta hover:border-cv-muted focus:border-cv-accent focus:ring-3 focus:ring-cv-accent/20 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-cv-danger aria-invalid:ring-cv-danger/20"
    const fieldPlaceholder = placeholder ?? `Enter ${label.toLowerCase()}`

    return (
      <div className="grid min-w-0 content-start gap-2">
        <label
          htmlFor={inputId}
          className="font-cv-mono text-xs tracking-wide text-cv-muted uppercase"
        >
          {label}
          {required && (
            <span aria-hidden="true" className="text-cv-accent">
              {" "}
              *
            </span>
          )}
        </label>
        {multiline ? (
          <textarea
            {...inputProps}
            id={inputId}
            ref={(element) => inputRef(element)}
            rows={4}
            maxLength={inputAttributes.maxLength}
            placeholder={fieldPlaceholder}
            disabled={disabled}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={`${fieldClassName} resize-y`}
          />
        ) : (
          <input
            {...inputAttributes}
            {...inputProps}
            id={inputId}
            ref={inputRef}
            type={type}
            placeholder={fieldPlaceholder}
            disabled={disabled}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={fieldClassName}
          />
        )}
        {multiline && inputAttributes.maxLength && (
          <span className="justify-self-end font-cv-mono text-xs text-cv-muted tabular-nums">
            {value.length} / {inputAttributes.maxLength}
          </span>
        )}
        {error && (
          <span id={errorId} role="alert" className="text-sm text-cv-danger">
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
            className={linkClassName}
          >
            {displayValue}
          </a>
        ) : (
          <span>{displayValue}</span>
        ))}
    </span>
  )
}
