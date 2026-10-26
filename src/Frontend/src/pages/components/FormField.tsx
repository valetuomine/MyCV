import type { JSX, ReactNode } from "react"

interface FormFieldProps {
  id: string
  label: string
  required?: boolean
  error?: string
  errorId: string
  children: ReactNode
}

/**
 * The frame of a form field: its label with a required marker, the field
 * itself, and its validation message beneath it.
 *
 * @param props - The component props.
 * @param props.id - The field element's ID, which the label points to.
 * @param props.label - The field's label.
 * @param props.required - Whether the field is required, marked with `*`.
 * @param props.error - The validation message, if any.
 * @param props.errorId - The message's ID, for the field's `aria-describedby`.
 * @param props.children - The field and anything shown right below it.
 * @returns The labelled field with its message.
 */
export default function FormField({
  id,
  label,
  required,
  error,
  errorId,
  children,
}: FormFieldProps): JSX.Element {
  return (
    <div className="grid min-w-0 content-start gap-2">
      <label
        htmlFor={id}
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
      {children}
      {error && (
        <span id={errorId} role="alert" className="text-sm text-cv-danger">
          {error}
        </span>
      )}
    </div>
  )
}
