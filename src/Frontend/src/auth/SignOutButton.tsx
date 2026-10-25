import { useState, type JSX } from "react"
import { signInMethodNames, signOutInApp, useAuthSession } from "./authSession"
import useSignOutReturnSegment from "./useSignOutReturnSegment"
import useSigningOutReason from "./useSigningOutReason"
import Button from "../pages/components/Button"
import { SignOutReason } from "../types"

/**
 * Shows the signed-in account and signs it out within the app, without
 * Microsoft's or Google's logout page. Renders nothing while nobody is signed in or a
 * sign-out is under way, when the sign-out screen takes over the page.
 * Remembers the CV being viewed, so Home can return to it after the sign-out.
 *
 * @returns The account name with the sign-out button, or null.
 */
export default function SignOutButton(): JSX.Element | null {
  const { account, isBusy, method } = useAuthSession()
  const signingOutReason = useSigningOutReason()
  const [signOutError, setSignOutError] = useState(false)
  const publicUrlSegment = useSignOutReturnSegment()

  if (!account || !method || signingOutReason) {
    return null
  }

  /** Signs out and returns to the CV on screen. Shows an error if it fails. */
  const handleSignOut = (): void => {
    setSignOutError(false)
    signOutInApp(publicUrlSegment, SignOutReason.User).catch(() => {
      setSignOutError(true)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        <p
          className="m-0 hidden max-w-56 truncate text-right text-sm text-cv-muted sm:block"
          title={account.username}
        >
          <span className="sr-only">Signed in as </span>
          {account.name}
        </p>
        <Button
          onClick={handleSignOut}
          disabled={isBusy}
          aria-label={`Sign out of ${signInMethodNames[method]}`}
        >
          Sign out
        </Button>
      </div>
      {signOutError && (
        <span role="alert" className="text-sm text-cv-danger">
          Could not sign out. Try again.
        </span>
      )}
    </div>
  )
}
