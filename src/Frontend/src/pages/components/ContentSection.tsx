import type { JSX } from "react"

export interface ContentSectionData {
  title: string
  body: string
  meta: string
}

interface ContentSectionProps {
  section: ContentSectionData
}

export default function ContentSection({
  section,
}: ContentSectionProps): JSX.Element {
  return (
    <div className="grid w-full items-center sm:pl-[clamp(0rem,8vw,7rem)]">
      <section
        className="relative grid max-w-3xl content-center justify-items-start text-left"
        aria-live="polite"
      >
        <h1 className="m-0 max-w-[16ch] font-cv-serif text-[clamp(2.75rem,5.5vw,4.75rem)] leading-[1.02] font-normal tracking-normal max-sm:text-[clamp(2.5rem,12vw,3.75rem)]">
          {section.title}
        </h1>
        <p className="mt-6 max-w-xl text-base leading-[1.7] text-cv-copy sm:mt-8">
          {section.body}
        </p>
        <p className="mt-8 font-cv-sans text-sm leading-[1.6] tracking-[0.02em] text-cv-meta">
          {section.meta}
        </p>
      </section>
    </div>
  )
}
