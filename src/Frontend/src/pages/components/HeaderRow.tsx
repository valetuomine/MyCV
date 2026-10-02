import type { JSX, ReactNode } from "react"

interface HeaderRowProps {
  children: ReactNode
}

export default function HeaderRow({ children }: HeaderRowProps): JSX.Element {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-8 gap-y-5 font-cv-mono text-[0.68rem] tracking-[0.08em] text-cv-muted uppercase max-sm:grid-cols-2">
      {children}
    </header>
  )
}
