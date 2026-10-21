import { useCallback, useEffect, useState, type JSX } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import Notice from "../pages/components/Notice"
import { getSignOutReason } from "./signedOutState"
import { SignOutReason } from "../types"

/**
 * Confirms a sign-out on the first page after it, and says when the user was
 * signed out for being idle. Then drops the router state, so a reload or back
 * navigation doesn't replay the notice.
 *
 * @returns The sign-out notice.
 */
export default function SignedOutNotice(): JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const [notice, setNotice] = useState<{
    key: string
    reason: SignOutReason
  } | null>(null)
  const signOutReason = getSignOutReason(location.state)
  const dismiss = useCallback(() => setNotice(null), [])

  if (signOutReason && notice?.key !== location.key) {
    setNotice({ key: location.key, reason: signOutReason })
  }

  useEffect(() => {
    if (signOutReason) {
      navigate(`${location.pathname}${location.search}`, {
        replace: true,
        state: null,
      })
    }
  }, [location.pathname, location.search, navigate, signOutReason])

  return (
    <Notice noticeKey={notice?.key ?? null} onDismiss={dismiss}>
      {notice?.reason === SignOutReason.Idle
        ? "You were signed out after 5 minutes of inactivity"
        : "You've signed out"}
    </Notice>
  )
}
