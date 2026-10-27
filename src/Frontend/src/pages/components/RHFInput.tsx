import type { InputHTMLAttributes, JSX, ReactNode } from "react"
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
  description?: ReactNode
  action?: ReactNode
}

/**
 * A labelled React Hook Form input with its validation message and, when
 * `maxLength` is set, a character count. Other native input attributes, such
 * as `placeholder`, are forwarded to the input.
 *
 * @param props - The component props.
 * @param props.name - The form field's name.
 * @param props.label - The field's label.
 * @param props.type - The input type.
 * @param props.maxLength - The character limit, which also shows the count.
 * @param props.required - Whether the field is required, marked with `*`.
 * @param props.description - A hint below the field, which also describes it
 * to screen readers.
 * @param props.action - A control beside the field, such as its form's
 * submit button, kept level with the field.
 * @returns The labelled input.
 */
export default function RHFInput<TFieldValues extends FieldValues>({
  name,
  label,
  type = InputType.Text,
  maxLength,
  required,
  description,
  action,
  ...inputAttributes
}: RHFInputProps<TFieldValues>): JSX.Element {
  const { id, error, describedBy, frameProps, registration } = useFormField(
    name,
    maxLength,
    description,
  )

  return (
    <FormField
      {...frameProps}
      label={label}
      required={required}
      description={description}
      action={action}
    >
      <input
        {...inputAttributes}
        {...registration}
        id={id}
        type={type}
        maxLength={maxLength}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={fieldClassName}
      />
    </FormField>
  )
}
