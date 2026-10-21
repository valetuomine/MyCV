import { InteractionStatus } from "@azure/msal-browser"
import { useMsal } from "@azure/msal-react"
import { useState, type JSX } from "react"
import { signOutInApp } from "./entraAuth"
import useSignOutReturnSegment from "./useSignOutReturnSegment"
import { secondaryButton } from "../pages/components/buttonStyles"
import { SignOutReason } from "../types"

/**
 * Shows the signed-in account and signs it out within the app, without
 * Microsoft's logout page. Renders nothing while nobody is signed in.
 * Remembers the CV being viewed, so Home can return to it after the sign-out.
 *
 * @returns The account name with the sign-out button, or null.
 */
export default function SignOutButton(): JSX.Element | null {
  const { accounts, inProgress, instance } = useMsal()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState(false)
  const publicUrlSegment = useSignOutReturnSegment()

  if (accounts.length === 0) {
    return null
  }

  /** The active account, or the first signed-in one. */
  const account = instance.getActiveAccount() ?? accounts[0]
  /** The account's display name, or its username when it has none. */
  const accountLabel = account.name || account.username
  const isBusy = isSigningOut || inProgress !== InteractionStatus.None
  /** Signs out and returns to the CV on screen. Shows an error if it fails. */
  const handleSignOut = (): void => {
    setSignOutError(false)
    setIsSigningOut(true)
    signOutInApp(publicUrlSegment, SignOutReason.User).catch(() => {
      setIsSigningOut(false)
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
          {accountLabel}
        </p>
        <button
          type="button"
          className={secondaryButton}
          onClick={handleSignOut}
          disabled={isBusy}
          aria-label="Sign out of Microsoft"
        >
          {isSigningOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
      {signOutError && (
        <span role="alert" className="text-sm text-cv-danger">
          Could not sign out. Try again.
        </span>
      )}
    </div>
  )
}
