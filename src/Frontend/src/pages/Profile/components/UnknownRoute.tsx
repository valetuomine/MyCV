import type { JSX } from "react"
import RouteMessage from "./RouteMessage"

export default function UnknownRoute(): JSX.Element {
  return <RouteMessage>That page could not be found.</RouteMessage>
}
