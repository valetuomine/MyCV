import { InteractionStatus } from "@azure/msal-browser"
import { useMsal } from "@azure/msal-react"
import { useState, type JSX } from "react"
import { clearLoginReturnPaths } from "./adminLoginStorage"
import { RoutePaths } from "../routePaths"
import { secondaryButton } from "../pages/components/buttonStyles"

export default function SignOutButton(): JSX.Element | null {
  const { accounts, inProgress, instance } = useMsal()
  const [signOutError, setSignOutError] = useState(false)

  if (accounts.length === 0) {
    return null
  }

  const isBusy = inProgress !== InteractionStatus.None
  const handleSignOut = (): void => {
    setSignOutError(false)
    clearLoginReturnPaths()
    void instance
      .logoutRedirect({
        account: instance.getActiveAccount() ?? accounts[0],
        postLogoutRedirectUri: `${window.location.origin}${RoutePaths.Home}`,
      })
      .catch(() => setSignOutError(true))
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className={secondaryButton}
        onClick={handleSignOut}
        disabled={isBusy}
        aria-label="Sign out of Microsoft"
      >
        {inProgress === InteractionStatus.Logout ? "Signing out…" : "Sign out"}
      </button>
      {signOutError && (
        <span role="alert" className="text-sm text-cv-danger">
          Could not sign out. Try again.
        </span>
      )}
    </div>
  )
}
