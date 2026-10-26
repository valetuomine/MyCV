import type { JSX } from "react"
import { useTranslation } from "react-i18next"
import RouteMessage from "../pages/Profile/components/RouteMessage"
import { SignOutReason, Tone } from "../types"

interface SignOutMessageProps {
  reason: SignOutReason
}

/**
 * The pending screen while a sign-out clears the session and reloads the
 * page, matching the sign-in screen. Says when the user is signed out for
 * being idle.
 *
 * @param props - The component props.
 * @param props.reason - Whether the user signed out or is signed out when idle.
 * @returns The sign-out screen.
 */
export default function SignOutMessage({
  reason,
}: SignOutMessageProps): JSX.Element {
  const { t } = useTranslation()

  return (
    <RouteMessage
      tone={Tone.Pending}
      description={
        reason === SignOutReason.Idle
          ? t("signOut.idleDescription")
          : t("signOut.userDescription")
      }
      showHomeButton={false}
    >
      {t("signOut.title")}
    </RouteMessage>
  )
}
