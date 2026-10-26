import { useId } from "react"
import {
  useFormContext,
  useFormState,
  type FieldValues,
  type Path,
  type UseFormRegisterReturn,
} from "react-hook-form"

interface FormFieldState<TFieldValues extends FieldValues> {
  id: string
  errorId: string
  error?: string
  registration: UseFormRegisterReturn<Path<TFieldValues>>
}

/**
 * Registers a field with the surrounding form and reads its validation
 * message. The message is looked up by the field's full path, so nested
 * names such as `translations.0.title` find theirs.
 *
 * @param name - The form field's name.
 * @returns The field's element ID, its error ID and message, and its
 * React Hook Form registration.
 */
export default function useFormField<TFieldValues extends FieldValues>(
  name: Path<TFieldValues>,
): FormFieldState<TFieldValues> {
  const id = useId()
  const { control, register, getFieldState } = useFormContext<TFieldValues>()
  const formState = useFormState({ control, name })
  const { error } = getFieldState(name, formState)

  return {
    id,
    errorId: `${id}-error`,
    error: error?.message,
    registration: register(name),
  }
}
