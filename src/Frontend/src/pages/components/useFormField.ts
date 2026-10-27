import { useId, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import {
  useFormContext,
  useFormState,
  useWatch,
  type FieldValues,
  type Path,
  type UseFormRegisterReturn,
} from "react-hook-form"
import { translateValidationMessage } from "../../i18n/validationMessage"
import type { FieldFrameProps } from "./FormField"

interface FormFieldState<TFieldValues extends FieldValues> {
  id: string
  error?: string
  describedBy?: string
  value: string
  frameProps: FieldFrameProps
  registration: UseFormRegisterReturn<Path<TFieldValues>>
}

/**
 * Registers a field with the surrounding form and reads its validation
 * message, its current text and the form's submit count. The message is
 * looked up by the field's full path, so nested names such as
 * `translations.0.title` find theirs, and translated into the active
 * language.
 *
 * @param name - The form field's name.
 * @param maxLength - The field's character limit, which adds the character
 * count to the field's description.
 * @param description - The field's description, if any. `FormField` shows it
 * when it is truthy, and the same test adds it to `aria-describedby`.
 * @returns The field element's ID, its message, `aria-describedby` and text,
 * the props for its `FormField` frame, and its React Hook Form registration.
 */
export default function useFormField<TFieldValues extends FieldValues>(
  name: Path<TFieldValues>,
  maxLength?: number,
  description?: ReactNode,
): FormFieldState<TFieldValues> {
  const id = useId()
  const { t } = useTranslation()
  const { control, register, getFieldState } = useFormContext<TFieldValues>()
  const formState = useFormState({ control, name })
  const value = String(useWatch({ control, name }) ?? "")
  const { error } = getFieldState(name, formState)
  const message = translateValidationMessage(t, error?.message)
  const errorId = `${id}-error`
  const countId = `${id}-count`
  const descriptionId = `${id}-description`
  /** The error, the count and the description, which describe the field. */
  const describedBy =
    [
      error && errorId,
      maxLength !== undefined && countId,
      Boolean(description) && descriptionId,
    ]
      .filter(Boolean)
      .join(" ") || undefined

  return {
    id,
    error: message,
    describedBy,
    value,
    frameProps: {
      id,
      error: message,
      errorId,
      maxLength,
      length: value.length,
      countId,
      descriptionId,
      submitCount: formState.submitCount,
    },
    registration: register(name),
  }
}
