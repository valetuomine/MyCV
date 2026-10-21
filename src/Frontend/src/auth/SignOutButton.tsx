import { InteractionStatus } from "@azure/msal-browser"
import { useMsal } from "@azure/msal-react"
import { useState, type JSX } from "react"
import { useMatch } from "react-router-dom"
import {
  clearAuthReturnPaths,
  logoutReturnPublicUrlSegmentKey,
} from "./adminLoginStorage"
import { RoutePaths } from "../routePaths"
import { secondaryButton } from "../pages/components/buttonStyles"

/**
 * Shows the signed-in account and signs it out. Renders nothing while nobody
 * is signed in. Remembers the CV being viewed, so Home can return to it after
 * the logout redirect.
 *
 * @returns The account name with the sign-out button, or null.
 */
export default function SignOutButton(): JSX.Element | null {
  const { accounts, inProgress, instance } = useMsal()
  const [signOutError, setSignOutError] = useState(false)
  const createProfileMatch = useMatch(RoutePaths.AdminCreateProfile)
  const candidateAdminMatch = useMatch(RoutePaths.CandidateAdminPattern)
  const candidateProfileMatch = useMatch(RoutePaths.CandidateProfilePattern)

  /** The CV on screen, or undefined on the create-profile page and Home. */
  const publicUrlSegment = createProfileMatch
    ? undefined
    : (candidateAdminMatch ?? candidateProfileMatch)?.params.publicUrlSegment

  if (accounts.length === 0) {
    return null
  }

  /** The active account, or the first signed-in one. */
  const account = instance.getActiveAccount() ?? accounts[0]
  /** The account's display name, or its username when it has none. */
  const accountLabel = account.name || account.username
  const isBusy = inProgress !== InteractionStatus.None
  /**
   * Stores the CV to return to and starts the logout redirect. Shows an error
   * if the redirect can't start.
   */
  const handleSignOut = (): void => {
    setSignOutError(false)
    clearAuthReturnPaths()

    sessionStorage.setItem(
      logoutReturnPublicUrlSegmentKey,
      publicUrlSegment ?? "",
    )
    void instance
      .logoutRedirect({
        account,
        postLogoutRedirectUri: `${window.location.origin}${RoutePaths.Home}`,
      })
      .catch(() => {
        clearAuthReturnPaths()
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
          {inProgress === InteractionStatus.Logout
            ? "Signing out…"
            : "Sign out"}
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
