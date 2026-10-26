import type { JSX } from "react"
import { useTranslation } from "react-i18next"
import RouteMessage from "../RouteMessage"

/**
 * The fallback for paths that match no route.
 *
 * @returns The page-not-found message.
 */
export default function UnknownRoute(): JSX.Element {
  const { t } = useTranslation()

  return (
    <RouteMessage description={t("notFound.description")}>
      {t("notFound.heading")}
    </RouteMessage>
  )
}
