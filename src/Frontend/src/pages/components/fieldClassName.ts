/**
 * The shared look of form inputs and textareas: colours, the hairline
 * border, focus ring, the invalid state, and a browser autofill that keeps
 * the surface fill and ink. The field itself is transparent, because its
 * `FormField` frame draws the surface beneath the hover light and fades the
 * whole field when it is disabled. The invalid ring shows with or without
 * focus. `RHFTextarea` builds its minimum height from the `py-2.5` padding
 * and the 1px border, so update it too when changing either.
 */
export const fieldClassName =
  "block w-full min-w-0 rounded-lg border border-cv-line bg-transparent px-3.5 py-2.5 text-cv-ink transition-[color,border-color,box-shadow] duration-200 outline-none placeholder:text-cv-meta autofill:caret-cv-ink autofill:inset-shadow-cv-autofill autofill:[-webkit-text-fill-color:var(--cv-ink)] hover:border-cv-muted focus:ring-3 motion-reduce:focus:border-cv-accent focus:ring-cv-accent/20 disabled:cursor-not-allowed aria-invalid:border-cv-danger aria-invalid:ring-3 aria-invalid:ring-cv-danger/20"
