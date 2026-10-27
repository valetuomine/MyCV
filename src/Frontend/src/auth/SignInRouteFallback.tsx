import type { JSX } from "react"
import { useTranslation } from "react-i18next"
import RouteMessage from "../pages/Profile/components/RouteMessage"
import { Tone } from "../types"

/**
 * The pending screen while a sign-in or admin route's chunk or data loads.
 *
 * @returns The delayed loading message.
 */
export default function SignInRouteFallback(): JSX.Element {
  const { t } = useTranslation()

  return (
    <RouteMessage tone={Tone.Pending} delayed showHomeButton={false}>
      {t("common.loading")}
    </RouteMessage>
  )
}
