import type { JSX } from "react"
import RouteMessage from "./RouteMessage"

export default function Home(): JSX.Element {
  return (
    <RouteMessage>
      Open a candidate profile using its candidate ID, for example{" "}
      <code>/{`{candidateId}`}</code>.
    </RouteMessage>
  )
}
