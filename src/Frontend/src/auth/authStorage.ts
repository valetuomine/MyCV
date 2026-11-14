/**
 * The cookie that marks this browser session. It has no expiry, so the
 * browser drops it when it closes, like MSAL's `msal.cache.encryption`
 * cookie, and a session stored under another browser session's ID is stale.
 */
const browserSessionCookie = "mycv-browser-session"

/**
 * Reads the browser session's ID from its cookie as it is now. A stored
 * session is checked against this rather than `browserSessionId`, because
 * the cookie can change while a tab is open, for example when the user
 * clears cookies and another tab starts a new browser session.
 *
 * @returns The ID, or null when the cookie is missing.
 */
export function readBrowserSessionCookie(): string | null {
  /** The cookie's `name=value` pair, if the browser has it. */
  const pair = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${browserSessionCookie}=`))
  return pair ? pair.slice(browserSessionCookie.length + 1) || null : null
}

/**
 * Storage key for the signed-in Google session (`googleAuth.ts`). It is kept
 * here because a new browser session removes it before the app reads it.
 */
export const googleSessionKey = "mycv-google-session"
/** The prefix of the keys of MSAL's cache. */
const msalKeyPrefix = "msal."

/**
 * Removes the sign-in sessions that an earlier browser session left in local
 * storage, before MSAL or the Google session reads them. MSAL's cache can't
 * be decrypted without the earlier session's key anyway, except for an
 * account signed in with "Stay signed in" (`signin_state: kmsi`), which MSAL
 * stores unencrypted and which would otherwise outlive the browser. Blocked
 * storage has nothing to remove.
 */
function removeEarlierSessions(): void {
  try {
    Object.keys(localStorage)
      .filter(
        (key) => key.startsWith(msalKeyPrefix) || key === googleSessionKey,
      )
      .forEach((key) => localStorage.removeItem(key))
  } catch {
    return
  }
}

/**
 * Reads the browser session's ID, creating the cookie on the first page load
 * after the browser opened. That first load also removes the sessions an
 * earlier browser session stored (`removeEarlierSessions`), as does every load
 * without the cookie, so a session never outlives the browser.
 * `SameSite=Strict` keeps the cookie out of every cross-site request, and
 * `Secure` out of plain HTTP outside localhost. Outside a secure context the
 * browser has no `crypto.randomUUID`, so there is no cookie either.
 *
 * @returns The ID, or null when the browser refuses cookies or the context isn't secure.
 */
function startBrowserSession(): string | null {
  const existing = readBrowserSessionCookie()
  if (existing) {
    return existing
  }

  removeEarlierSessions()
  if (typeof crypto.randomUUID !== "function") {
    return null
  }

  /** Marks the cookie HTTPS-only wherever the app runs over HTTPS. */
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${browserSessionCookie}=${crypto.randomUUID()}; Path=/; SameSite=Strict${secure}`
  return readBrowserSessionCookie()
}

/**
 * This browser session's ID, which ties a stored sign-in session to the
 * browser session that stored it. Null when cookies are blocked.
 */
export const browserSessionId = startBrowserSession()

/**
 * Where the signed-in sessions are kept: local storage, shared by the app's
 * tabs, while the browser session's cookie works. Without it a stored session
 * could outlive the browser, so the session then stays in the tab's session
 * storage as before.
 *
 * @returns The storage for the Google session.
 */
export function getAuthSessionStorage(): Storage {
  return browserSessionId ? localStorage : sessionStorage
}
