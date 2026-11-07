import type { JSX } from "react"

interface LocationIconProps {
  className?: string
}

/**
 * The map pin shown before a CV's location. It is decorative, so assistive
 * tech skips it and reads the location text beside it.
 *
 * @param props - The component props.
 * @param props.className - The icon's size and placement.
 * @returns The pin icon.
 */
export default function LocationIcon({
  className,
}: LocationIconProps): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  )
}
