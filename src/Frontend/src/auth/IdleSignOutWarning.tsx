import { AnimatePresence } from "framer-motion"
import type { JSX } from "react"
import IdleWarningPanel from "./IdleWarningPanel"
import useIdleSignOut from "./useIdleSignOut"

/**
 * Signs an idle user out (`useIdleSignOut`) and, for the last minute before
 * it, shows the warning with its countdown and Continue session. Kept in its
 * own component, so the countdown re-renders only the warning, not the page.
 *
 * @returns The warning while it is due, otherwise nothing.
 */
export default function IdleSignOutWarning(): JSX.Element {
  const { secondsLeft, continueSession } = useIdleSignOut()

  return (
    <AnimatePresence>
      {secondsLeft !== null && (
        <IdleWarningPanel
          key="idle-warning"
          secondsLeft={secondsLeft}
          onContinue={continueSession}
        />
      )}
    </AnimatePresence>
  )
}
