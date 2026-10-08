import { motion } from "framer-motion"
import type { JSX } from "react"

interface SectionNavigationHintProps {
  selectedIndex: number
  sectionCount: number
}

export default function SectionNavigationHint({
  selectedIndex,
  sectionCount,
}: SectionNavigationHintProps): JSX.Element {
  const isFirstSection = selectedIndex === 0
  const isLastSection = selectedIndex === sectionCount - 1

  return (
    <div
      className="mt-auto flex items-center justify-center gap-3 pb-2 pt-4 font-cv-sans text-base tracking-[0.08em] text-cv-muted"
      aria-label="Section navigation hint"
    >
      <span aria-hidden="true">
        {String(selectedIndex + 1).padStart(2, "0")} /{" "}
        {String(sectionCount).padStart(2, "0")}
      </span>
      <motion.span
        className="text-xl"
        animate={{ y: isLastSection ? [0, -5, 0] : [0, 5, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      >
        {isLastSection ? "↑" : "↓"}
      </motion.span>
      <span>
        {isFirstSection
          ? "Scroll down to explore"
          : isLastSection
            ? "Scroll up to revisit"
            : "Scroll to continue"}
        <span className="ml-2 text-cv-meta">
          or press {isFirstSection ? "↓" : isLastSection ? "↑" : "↑ / ↓"}
        </span>
      </span>
    </div>
  )
}
