/**
 * The shared look of form inputs and textareas: colours, border, focus ring,
 * and the disabled and invalid states. `RHFTextarea` builds its minimum
 * height from the `py-2.5` padding and the 1px border, so update it too when
 * changing either.
 */
export const fieldClassName =
  "w-full min-w-0 rounded-lg border border-cv-field bg-cv-wash px-3.5 py-2.5 text-cv-ink transition-colors outline-none placeholder:text-cv-meta hover:border-cv-muted focus:border-cv-accent focus:ring-3 focus:ring-cv-accent/20 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-cv-danger aria-invalid:ring-cv-danger/20"
