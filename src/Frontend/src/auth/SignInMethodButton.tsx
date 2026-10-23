import { useId, type JSX } from "react"
import googleLogo from "../assets/google-g-logo.svg"
import microsoftLogo from "../assets/microsoft-logo.svg"
import { buttonBase } from "../pages/components/buttonStyles"
import { signInMethodNames } from "./authSession"
import { SignInMethod } from "../types"

/** Each method's logo and brand colours, from Google's and Microsoft's sign-in button guidelines. */
const methodStyles: Record<SignInMethod, { logo: string; className: string }> =
  {
    [SignInMethod.Microsoft]: {
      logo: microsoftLogo,
      className:
        "border-cv-microsoft-line bg-cv-microsoft-surface text-cv-microsoft-ink",
    },
    [SignInMethod.Google]: {
      logo: googleLogo,
      className:
        "border-cv-google-line bg-cv-google-surface text-cv-google-ink",
    },
  }

interface SignInMethodButtonProps {
  method: SignInMethod
  isLastUsed: boolean
  onSelect: (method: SignInMethod) => void
}

/**
 * A "Sign in with …" button in the provider's brand colours with its logo,
 * and a "Last used" badge on the method of the last successful sign-in.
 *
 * @param props - The component props.
 * @param props.method - The sign-in method the button starts.
 * @param props.isLastUsed - Whether to show the "Last used" badge.
 * @param props.onSelect - Starts sign-in with the method.
 * @returns The sign-in button.
 */
export default function SignInMethodButton({
  method,
  isLastUsed,
  onSelect,
}: SignInMethodButtonProps): JSX.Element {
  const badgeId = useId()
  const { logo, className } = methodStyles[method]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onSelect(method)}
        aria-describedby={isLastUsed ? badgeId : undefined}
        className={`${buttonBase} w-full border hover:shadow-cv-panel ${className}`}
      >
        <img src={logo} alt="" aria-hidden="true" className="size-5" />
        Sign in with {signInMethodNames[method]}
      </button>
      {isLastUsed && (
        <span
          id={badgeId}
          className="pointer-events-none absolute -top-2.5 right-5 rounded-full bg-cv-accent px-2 py-0.5 font-cv-mono text-[0.625rem] tracking-wide text-cv-accent-ink uppercase"
        >
          Last used
        </span>
      )}
    </div>
  )
}
