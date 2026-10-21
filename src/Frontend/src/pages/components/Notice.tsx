import { AnimatePresence, m as motion } from "framer-motion"
import { useEffect, type JSX, type ReactNode } from "react"

interface NoticeProps {
  noticeKey: string | null
  onDismiss: () => void
  children: ReactNode
}

const visibleMs = 4000

/**
 * A short confirmation pill at the bottom centre that dismisses itself after
 * `visibleMs`. The status region is always rendered, so screen readers
 * announce the message when it appears. Pass a stable `onDismiss`, or the
 * timer restarts on every render.
 *
 * @param props - The component props.
 * @param props.noticeKey - Shows the notice while set; a new key restarts it.
 * @param props.onDismiss - Hides the notice when its time is up.
 * @param props.children - The message.
 * @returns The status region with the notice when shown.
 */
export default function Notice({
  noticeKey,
  onDismiss,
  children,
}: NoticeProps): JSX.Element {
  useEffect(() => {
    if (!noticeKey) {
      return
    }

    const timeout = setTimeout(onDismiss, visibleMs)
    return () => clearTimeout(timeout)
  }, [noticeKey, onDismiss])

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
            {children}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
