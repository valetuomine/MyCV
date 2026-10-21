import type { JSX } from "react"
import RouteMessage from "../RouteMessage"

/**
 * The fallback for paths that match no route.
 *
 * @returns The page-not-found message.
 */
export default function UnknownRoute(): JSX.Element {
  return (
    <RouteMessage description="The link may be mistyped or the CV may have moved. Check the address, or open a CV with its public link.">
      We couldn't find that page.
    </RouteMessage>
  )
}
