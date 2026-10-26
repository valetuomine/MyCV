import { useState, type JSX } from "react"

interface FieldMessageProps {
  id: string
  error?: string
}

/**
 * A form field's validation message, which opens and fades in below the
 * field and keeps its last text while it closes. A new message is a new
 * alert, so screen readers announce it even when the text repeats. Reduced
 * motion only fades it.
 *
 * @param props - The component props.
 * @param props.id - The message's ID, for the field's `aria-describedby`.
 * @param props.error - The validation message, if any.
 * @returns The message region.
 */
export default function FieldMessage({
  id,
  error,
}: FieldMessageProps): JSX.Element {
  const [lastError, setLastError] = useState(error)

  if (error && error !== lastError) {
    setLastError(error)
  }

  return (
    <div
      className={`-mt-2 grid transition-[grid-template-rows,opacity,visibility] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-[opacity,visibility] ${error ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0"}`}
    >
      <div className="min-h-0 overflow-hidden">
        {error ? (
          <span
            key="error"
            id={id}
            role="alert"
            className="block pt-2 text-sm text-cv-danger"
          >
            {error}
          </span>
        ) : (
          <span key="last-error" className="block pt-2 text-sm text-cv-danger">
            {lastError}
          </span>
        )}
      </div>
    </div>
  )
}
