import type { JSX } from "react"

const bar = "rounded-full bg-cv-overlay motion-safe:animate-pulse"

export default function ProfileSkeleton(): JSX.Element {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col pt-20 lg:pt-4"
    >
      <div
        role="status"
        className="grid w-full flex-1 items-center gap-14 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16"
      >
        <span className="sr-only">Loading CV…</span>
        <div aria-hidden="true" className="grid justify-items-start gap-6">
          <div className={`${bar} h-3 w-40`} />
          <div
            className={`${bar} h-[clamp(3rem,8.5vw,7rem)] w-full max-w-2xl`}
          />
          <div className={`${bar} h-6 w-64`} />
          <div className={`${bar} h-4 w-full max-w-[52ch]`} />
        </div>
        <div
          aria-hidden="true"
          className="h-44 w-full max-w-md lg:h-[clamp(16rem,46dvh,26rem)] rounded-3xl border border-cv-line bg-cv-surface lg:justify-self-end"
        />
      </div>
    </main>
  )
}
