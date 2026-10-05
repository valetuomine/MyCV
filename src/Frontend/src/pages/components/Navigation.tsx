import type { JSX } from "react"
import { motion } from "framer-motion"

export interface NavigationSection {
  label: string
}

interface NavigationProps {
  sections: readonly NavigationSection[]
  selectedIndex: number
  onSelect: (index: number) => void
}

export default function Navigation({
  sections,
  selectedIndex,
  onSelect,
}: NavigationProps): JSX.Element {
  return (
    <nav
      className="flex w-full flex-wrap items-center justify-start gap-x-2 gap-y-1 py-2 sm:gap-x-5"
      aria-label="CV sections"
    >
      {sections.map(({ label }, i) => {
        const isSelected = selectedIndex === i

        return (
          <button
            key={label}
            type="button"
            className={`relative cursor-pointer px-1 py-2 font-cv-sans text-sm font-medium tracking-normal normal-case transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-cv-accent sm:px-2 ${
              isSelected ? "text-cv-paper" : "text-cv-muted hover:text-cv-paper"
            }`}
            aria-current={isSelected ? "page" : undefined}
            onClick={() => onSelect(i)}
          >
            {isSelected && (
              <motion.span
                layoutId="active-cv-section-underline"
                className="absolute inset-x-1 bottom-0 h-px bg-cv-paper sm:inset-x-2"
                transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
              />
            )}
            <span className="relative">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
