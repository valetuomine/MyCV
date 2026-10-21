import { useCallback, useEffect, useState, type JSX } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import Notice from "../pages/components/Notice"
import { isSignedOutLocationState } from "./signedOutState"

/**
 * Confirms a sign-out on the first page after the logout redirect. Then drops
 * the router state, so a reload or back navigation doesn't replay the notice.
 *
 * @returns The sign-out notice.
 */
export default function SignedOutNotice(): JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const [noticeKey, setNoticeKey] = useState<string | null>(null)
  const hasSignedOutState = isSignedOutLocationState(location.state)
  const dismiss = useCallback(() => setNoticeKey(null), [])

  if (hasSignedOutState && noticeKey !== location.key) {
    setNoticeKey(location.key)
  }

  useEffect(() => {
    if (hasSignedOutState) {
      navigate(`${location.pathname}${location.search}`, {
        replace: true,
        state: null,
      })
    }
  }, [hasSignedOutState, location.pathname, location.search, navigate])

  return (
    <Notice noticeKey={noticeKey} onDismiss={dismiss}>
      You've signed out
    </Notice>
  )
}
