import { baseURL, devEnvFile, parseLocalURL } from "./settings.ts"

/** An app module that the dev server serves with its settings at the top. */
const settingsProbePath = "/src/auth/authStorage.ts"

/** Matches the `import.meta.env` object that Vite's dev server writes into a module. */
const servedSettingsPattern = /^import\.meta\.env = (\{.*?\});/m

/** The dev server's settings that the tests depend on. */
interface ServedSettings {
  VITE_AUTH_STORAGE?: string
  VITE_API_BASE_URL?: string
}

/**
 * Reads the settings that the running frontend actually uses, from a module
 * that its Vite dev server serves. Only the dev server has them there, so a
 * built app fails here too.
 *
 * @returns The running dev server's settings.
 */
async function readServedSettings(): Promise<ServedSettings> {
  const url = new URL(settingsProbePath, baseURL).toString()
  /** The served module's source, or "" when it didn't load. */
  const source = await fetch(url)
    .then((response) => (response.ok ? response.text() : ""))
    .catch(() => "")
  /** The settings object in the module's first line, if Vite wrote one. */
  const match = servedSettingsPattern.exec(source)
  if (!match) {
    throw new Error(
      `Couldn't read the frontend's settings from ${url}. The tests need the Vite dev server (npm --prefix src/Frontend run dev), not a built app.`,
    )
  }
  return JSON.parse(match[1]) as ServedSettings
}

/**
 * Checks before any sign-in or test that the running frontend can hold the
 * saved sessions and sends its API requests to this machine: it keeps the
 * sessions in local storage (`VITE_AUTH_STORAGE=local`), and its
 * `VITE_API_BASE_URL` is empty (the `/api` proxy to the local API) or local.
 */
export async function assertTestDevServer(): Promise<void> {
  const settings = await readServedSettings()
  if (settings.VITE_AUTH_STORAGE?.trim().toLowerCase() !== "local") {
    throw new Error(
      `The frontend at ${baseURL} keeps the sign-in sessions in session storage, which saved sessions can't hold. Set VITE_AUTH_STORAGE=local in ${devEnvFile} and restart the dev server.`,
    )
  }
  const apiBaseUrl = settings.VITE_API_BASE_URL?.trim()
  if (apiBaseUrl) {
    parseLocalURL("The frontend's VITE_API_BASE_URL", apiBaseUrl)
  }
}
