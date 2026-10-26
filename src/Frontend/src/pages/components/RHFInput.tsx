import type { InputHTMLAttributes, JSX } from "react"
import type { FieldValues, Path } from "react-hook-form"
import { InputType } from "../../types"
import { fieldClassName } from "./fieldClassName"
import FormField from "./FormField"
import useFormField from "./useFormField"

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
}

/**
 * A labelled React Hook Form input with its validation message. Other native
 * input attributes are forwarded to the input.
 *
 * @param props - The component props.
 * @param props.name - The form field's name.
 * @param props.label - The field's label.
 * @param props.type - The input type.
 * @param props.placeholder - The placeholder, built from the label by default.
 * @param props.required - Whether the field is required, marked with `*`.
 * @returns The labelled input.
 */
export default function RHFInput<TFieldValues extends FieldValues>({
  name,
  label,
  type = InputType.Text,
  placeholder,
  required,
  ...inputAttributes
}: RHFInputProps<TFieldValues>): JSX.Element {
  const { id, errorId, error, registration } = useFormField(name)
  /** The given placeholder, or one built from the label. */
  const fieldPlaceholder = placeholder ?? `Enter ${label.toLowerCase()}`

  return (
    <FormField
      id={id}
      label={label}
      required={required}
      error={error}
      errorId={errorId}
    >
      <input
        {...inputAttributes}
        {...registration}
        id={id}
        type={type}
        placeholder={fieldPlaceholder}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={fieldClassName}
      />
    </FormField>
  )
}
