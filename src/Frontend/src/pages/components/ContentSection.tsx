import type { JSX } from 'react'

export interface ContentSectionData {
  title: string
  body: string
  meta: string
}

interface ContentSectionProps {
  section: ContentSectionData
}

export default function ContentSection({ section }: ContentSectionProps): JSX.Element {
  return (
    <div className="mx-auto grid w-full max-w-7xl items-center max-sm:py-12">
      <section className="relative grid max-w-2xl content-center justify-items-center justify-self-center text-center [text-shadow:0_1px_14px_rgba(7,17,29,0.45)]" aria-live="polite">
        <h1 className="m-0 max-w-[12ch] text-[clamp(2.9rem,7.5vw,6.25rem)] leading-[0.98] font-semibold tracking-normal max-sm:text-[clamp(2.5rem,13vw,4rem)]">{section.title}</h1>
        <p className="mt-8 max-w-lg text-[1.05rem] leading-[1.7] text-cv-copy">{section.body}</p>
        <p className="mt-10 font-cv-mono text-[0.72rem] leading-[1.6] tracking-[0.04em] text-cv-meta">{section.meta}</p>
      </section>
    </div>
  )
}
