import {
  useEffect,
  useLayoutEffect,
  useRef,
  type JSX,
  type TextareaHTMLAttributes,
} from "react"
import type { FieldValues, Path } from "react-hook-form"
import { fieldClassName } from "./fieldClassName"
import FormField from "./FormField"
import useFormField from "./useFormField"

interface RHFTextareaProps<TFieldValues extends FieldValues> extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  | "aria-describedby"
  | "aria-invalid"
  | "className"
  | "defaultValue"
  | "id"
  | "name"
  | "onBlur"
  | "onChange"
  | "value"
> {
  name: Path<TFieldValues>
  label: string
}

/** Tells whether the browser can size a textarea to its content in CSS. */
const supportsFieldSizing = CSS.supports("field-sizing", "content")

/**
 * Sets a textarea's height to fit its text, for browsers without
 * `field-sizing`. The height is first reset so the textarea also shrinks,
 * and its `rows` and CSS `max-height` still bound the result.
 *
 * @param textarea - The textarea to size.
 */
function fitToContent(textarea: HTMLTextAreaElement): void {
  textarea.style.height = "auto"
  textarea.style.height = `${textarea.scrollHeight + textarea.offsetHeight - textarea.clientHeight}px`
}

/**
 * A labelled React Hook Form textarea with its validation message and, when
 * `maxLength` is set, a character count. The textarea grows with its text,
 * through CSS `field-sizing` or, where that isn't supported, a layout effect
 * that fits it to every new value, including the initial one and a form
 * reset, and a resize observer that fits it again when its width changes the
 * line wrapping. Past about the viewport's height it scrolls inside. Other
 * native textarea attributes, such as `placeholder`, are forwarded to the
 * textarea.
 *
 * @param props - The component props.
 * @param props.name - The form field's name.
 * @param props.label - The field's label.
 * @param props.rows - The fewest lines the textarea shows.
 * @param props.maxLength - The character limit, which also shows the count.
 * @param props.required - Whether the field is required, marked with `*`.
 * @returns The labelled textarea.
 */
export default function RHFTextarea<TFieldValues extends FieldValues>({
  name,
  label,
  rows = 4,
  maxLength,
  required,
  ...textareaAttributes
}: RHFTextareaProps<TFieldValues>): JSX.Element {
  const { id, error, describedBy, value, frameProps, registration } =
    useFormField(name, maxLength)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const { ref: registerRef, ...textareaProps } = registration
  /**
   * Keeps at least `rows` lines visible, because `field-sizing` ignores
   * `rows`: the lines plus the `py-2.5` padding and the 1px borders.
   */
  const minHeight = `calc(${rows}lh + 1.25rem + 2px)`

  /**
   * Hands the textarea to React Hook Form, which focuses it on an error, and
   * keeps it for sizing.
   *
   * @param element - The textarea, or `null` when it unmounts.
   */
  const setTextareaRef = (element: HTMLTextAreaElement | null): void => {
    registerRef(element)
    textareaRef.current = element
  }

  useLayoutEffect(() => {
    if (!supportsFieldSizing && textareaRef.current) {
      fitToContent(textareaRef.current)
    }
  }, [value])

  useEffect(() => {
    const textarea = textareaRef.current
    if (supportsFieldSizing || !textarea) {
      return
    }

    let width = textarea.offsetWidth
    const observer = new ResizeObserver(() => {
      if (textarea.offsetWidth !== width) {
        width = textarea.offsetWidth
        fitToContent(textarea)
      }
    })
    observer.observe(textarea)
    return () => observer.disconnect()
  }, [])

  return (
    <FormField {...frameProps} label={label} required={required}>
      <textarea
        {...textareaAttributes}
        {...textareaProps}
        ref={setTextareaRef}
        id={id}
        rows={rows}
        maxLength={maxLength}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        style={{ minHeight }}
        className={`${fieldClassName} field-sizing-content max-h-[70dvh] resize-none`}
      />
    </FormField>
  )
}
