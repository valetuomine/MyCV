/**
 * Reads the app's language from `<html lang>`, so the providers' sign-in
 * pages match the app instead of the browser's language.
 *
 * @returns The language tag, English when none is set.
 */
export function signInLanguage(): string {
  return document.documentElement.lang || "en"
}

/**
 * Builds the query parameters that every Microsoft sign-in request carries,
 * with the app's language: OpenID Connect's `ui_locales`, and `mkt`, which
 * is the one Microsoft's sign-in page follows; it ignores `ui_locales`.
 *
 * @returns The parameters for an MSAL request's `extraQueryParameters`.
 */
export function microsoftSignInParameters(): Record<string, string> {
  const language = signInLanguage()
  return { ui_locales: language, mkt: language }
}
