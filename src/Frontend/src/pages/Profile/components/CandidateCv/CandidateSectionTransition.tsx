import { AnimatePresence, motion } from "framer-motion"
import type { JSX, ReactNode } from "react"

interface CandidateSectionTransitionProps {
  direction: number
  sectionIndex: number
  sectionLabel: string
  children: ReactNode
}

export default function CandidateSectionTransition({
  direction,
  sectionIndex,
  sectionLabel,
  children,
}: CandidateSectionTransitionProps): JSX.Element {
  return (
    <div className="flex flex-1 items-center pb-16 pt-16 sm:pb-24 sm:pt-20">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={sectionIndex}
          className="w-full"
          custom={direction}
          variants={{
            enter: (scrollDirection: number) => ({
              y: scrollDirection > 0 ? "100vh" : "-100vh",
              opacity: 0,
            }),
            center: { y: 0, opacity: 1 },
            exit: (scrollDirection: number) => ({
              y: scrollDirection > 0 ? "-100vh" : "100vh",
              opacity: 0,
            }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          aria-label={sectionLabel}
          role="region"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
