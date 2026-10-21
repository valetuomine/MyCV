import { useCallback, useEffect, useState, type JSX } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import Notice from "../pages/components/Notice"
import { isSignedOutLocationState } from "./signedOutState"

export default function SignedOutNotice(): JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const [noticeKey, setNoticeKey] = useState<string | null>(null)
  const hasSignedOutState = isSignedOutLocationState(location.state)
  const dismiss = useCallback(() => setNoticeKey(null), [])

  if (hasSignedOutState && noticeKey !== location.key) {
    setNoticeKey(location.key)
  }

  // Drop the router state so a reload or back navigation doesn't replay the notice.
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
