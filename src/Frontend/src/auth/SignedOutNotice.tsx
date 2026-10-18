import { AnimatePresence, m as motion } from "framer-motion"
import { useEffect, useState, type JSX } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { isSignedOutLocationState } from "./signedOutState"

const visibleMs = 4000

export default function SignedOutNotice(): JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const [noticeKey, setNoticeKey] = useState<string | null>(null)
  const hasSignedOutState = isSignedOutLocationState(location.state)

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

  useEffect(() => {
    if (!noticeKey) {
      return
    }

    const timeout = setTimeout(() => setNoticeKey(null), visibleMs)
    return () => clearTimeout(timeout)
  }, [noticeKey])

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4"
    >
      <AnimatePresence>
        {noticeKey && (
          <motion.p
            key={noticeKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="m-0 flex items-center gap-3 rounded-full border border-cv-line bg-cv-surface px-4 py-2.5 text-sm text-cv-ink shadow-lg"
          >
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-cv-accent"
            />
            You've signed out
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
