export const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors transition-transform transition-shadow duration-150 ease-out active:translate-y-px active:scale-[0.98] motion-reduce:active:translate-y-0 motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cv-accent disabled:cursor-not-allowed disabled:opacity-60"

export const primaryButton = `${buttonBase} bg-cv-accent text-cv-accent-ink hover:bg-cv-ink hover:shadow-cv-accent`

export const secondaryButton = `${buttonBase} border border-cv-line text-cv-ink hover:border-cv-meta hover:bg-cv-overlay`

export const externalLinkArrow =
  "after:inline-block after:transition-transform after:duration-200 after:content-['↗'] hover:after:translate-x-0.5 hover:after:-translate-y-0.5 motion-reduce:hover:after:translate-0"
