/**
 * True when the dev server runs with `VITE_AUTH_STORAGE=local`, which keeps
 * MSAL's cache and the Google session in local storage. Only the Playwright
 * tests use it: their saved browser state holds cookies and local storage,
 * never session storage. `vite build` ignores the variable, because
 * `import.meta.env.DEV` is false there and the check is dropped from the
 * bundle, so a built app always keeps both in session storage and a session
 * never outlives its tab.
 */
export const isLocalAuthStorage =
  import.meta.env.DEV &&
  import.meta.env.VITE_AUTH_STORAGE?.trim().toLowerCase() === "local"

/**
 * Where the signed-in sessions are kept: local storage on a dev server set up
 * for the Playwright tests, otherwise session storage.
 *
 * @returns The storage for MSAL's cache and the Google session.
 */
export function getAuthSessionStorage(): Storage {
  return isLocalAuthStorage ? localStorage : sessionStorage
}
