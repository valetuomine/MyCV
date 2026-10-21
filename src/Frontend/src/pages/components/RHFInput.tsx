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

/**
 * A React Hook Form field. While editing it renders a labelled input or
 * textarea with its validation message and, for limited textareas, a
 * character count. Otherwise it renders the value as text, or as a link when
 * `link` is set. Other native input attributes are forwarded to the input.
 *
 * @param props - The component props.
 * @param props.name - The form field's name.
 * @param props.label - The field's label.
 * @param props.type - The input type, which also decides the link's scheme.
 * @param props.placeholder - The placeholder, built from the label by default.
 * @param props.disabled - Whether the field is disabled.
 * @param props.required - Whether the field is required, marked with `*`.
 * @param props.link - Whether to show the value as a link when not editing.
 * @param props.multiline - Whether to edit the value in a textarea.
 * @param props.displayLabel - Text to show instead of the value.
 * @param props.className - Classes for the read-only wrapper.
 * @param props.linkClassName - Classes for the read-only link.
 * @param props.isEditing - Whether to render the field or the value.
 * @returns The labelled field, or the value as text or a link.
 */
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
  /** Email and phone links open in the mail or phone app, not a new tab. */
  const isContactLink = type === InputType.Email || type === InputType.Tel
  /** A `mailto:` or `tel:` link, or the URL with `https://` added if missing. */
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
    /** The given placeholder, or one built from the label. */
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
