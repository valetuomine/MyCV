import { useId, type JSX } from "react"
import { useTranslation } from "react-i18next"
import googleLogo from "../assets/google-g-logo.svg"
import microsoftLogo from "../assets/microsoft-logo.svg"
import Button from "../pages/components/Button"
import { signInMethodNames } from "./authSession"
import { ButtonVariant, SignInMethod } from "../types"

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
  isLastUsed?: boolean
  label?: string
  disabled?: boolean
  describedBy?: string
  autoFocus?: boolean
  onSelect: (method: SignInMethod) => void
}

/**
 * A "Sign in with …" button, or another label such as "Add Google", in
 * the provider's brand colours with its logo, built on the brand `Button`,
 * and a "Last used" badge on the method of the last successful sign-in.
 *
 * @param props - The component props.
 * @param props.method - The sign-in method the button starts.
 * @param props.isLastUsed - Whether to show the "Last used" badge.
 * @param props.label - The button text, "Sign in with …" by default.
 * @param props.disabled - Whether the button is unavailable. It stays
 *   focusable (`aria-disabled`), so `describedBy` can explain why.
 * @param props.describedBy - The ID of an element that explains the button, such as why it is disabled.
 * @param props.autoFocus - Whether the button takes focus when it appears, such as after a cancelled sign-in.
 * @param props.onSelect - Starts sign-in with the method.
 * @returns The sign-in button.
 */
export default function SignInMethodButton({
  method,
  isLastUsed = false,
  label,
  disabled = false,
  describedBy,
  autoFocus = false,
  onSelect,
}: SignInMethodButtonProps): JSX.Element {
  const { t } = useTranslation()
  const badgeId = useId()
  const { logo, className } = methodStyles[method]

  return (
    <div className="relative">
      <Button
        variant={ButtonVariant.Brand}
        onClick={() => onSelect(method)}
        aria-disabled={disabled || undefined}
        autoFocus={autoFocus}
        aria-describedby={
          [isLastUsed ? badgeId : null, describedBy]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={`w-full ${className}`}
      >
        <img src={logo} alt="" aria-hidden="true" className="size-5" />
        {label ??
          t("signIn.signInWith", { provider: signInMethodNames[method] })}
      </Button>
      {isLastUsed && (
        <span
          id={badgeId}
          className="pointer-events-none absolute -top-2.5 right-5 rounded-full bg-cv-accent px-2 py-0.5 font-cv-mono text-[0.625rem] tracking-wide text-cv-accent-ink uppercase"
        >
          {t("signIn.lastUsed")}
        </span>
      )}
    </div>
  )
}
