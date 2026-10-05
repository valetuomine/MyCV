import type { JSX, ReactNode } from "react"

interface BackgroundProps {
  children: ReactNode
}

export default function Background({ children }: BackgroundProps): JSX.Element {
  return (
    <main className="relative isolate min-h-screen overflow-x-clip bg-cv-background text-cv-paper">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(125% 125% at 50% 10%, var(--color-cv-background) 40%, var(--color-cv-gradient-edge) 100%)",
        }}
      />
      <div className="relative z-10 min-h-screen px-[clamp(1.5rem,5vw,5.5rem)] max-sm:px-5">
        {children}
      </div>
    </main>
  )
}
