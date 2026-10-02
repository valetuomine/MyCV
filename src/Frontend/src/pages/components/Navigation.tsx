import type { JSX } from 'react'

export interface NavigationSection {
  label: string
}

interface NavigationProps {
  sections: readonly NavigationSection[]
  selectedIndex: number
  onSelect: (index: number) => void
}

export default function Navigation({ sections, selectedIndex, onSelect }: NavigationProps): JSX.Element {
  return (
    <nav className="flex items-center gap-8 max-sm:order-3 max-sm:col-span-2 max-sm:gap-5 max-sm:overflow-x-auto" aria-label="CV sections">
      {sections.map(({ label }, i) => (
        <button
          key={label}
          type="button"
          className={`relative cursor-pointer whitespace-nowrap border-b-2 pb-2 font-cv-sans text-[0.95rem] font-semibold tracking-normal normal-case transition-colors hover:text-cv-paper focus-visible:outline-2 focus-visible:outline-cv-accent ${selectedIndex === i ? 'border-cv-accent text-cv-paper' : 'border-transparent text-cv-copy'}`}
          aria-current={selectedIndex === i ? 'page' : undefined}
          onClick={() => onSelect(i)}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}
