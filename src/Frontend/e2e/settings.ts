import { homedir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

/** The `e2e` folder, where this file lives. */
const e2eDir = path.dirname(fileURLToPath(import.meta.url))

/** The host names that the tests may reach: only this machine. */
const localHosts = new Set(["localhost", "127.0.0.1"])

/**
 * Parses an `http` or `https` address and refuses anything that is not on
 * this machine, because the tests edit and save CVs.
 *
 * @param name - The setting the address comes from, for the error message.
 * @param value - The address.
 * @returns The parsed local address.
 */
export function parseLocalURL(name: string, value: string): URL {
  /** The parsed address, or null when it isn't a full `http(s)` URL. */
  const url = URL.canParse(value) ? new URL(value) : null
  if (!url || !/^https?:$/.test(url.protocol)) {
    throw new Error(
      `${name} must be a full http address such as http://localhost:3000, not "${value}".`,
    )
  }
  if (!localHosts.has(url.hostname)) {
    throw new Error(
      `${name} must point to this machine (localhost or 127.0.0.1), not ${url.hostname}, because the tests edit and save CVs.`,
    )
  }
  return url
}

/**
 * Reads the frontend's address from `E2E_BASE_URL`, or the default local one.
 *
 * @returns The local frontend's address.
 */
function readBaseURL(): URL {
  return parseLocalURL(
    "E2E_BASE_URL",
    process.env.E2E_BASE_URL?.trim() || "http://localhost:3000",
  )
}

/** The local frontend that the tests open. */
const base = readBaseURL()

/** The app the tests open, without a trailing slash. */
export const baseURL = base.origin
/** The port that Playwright's own dev server listens on, from `baseURL`. */
export const basePort = base.port || "80"
/**
 * The local API, checked before the run starts. Fixed, like the Vite proxy
 * that the frontend sends `/api` requests through.
 */
export const apiURL = "http://localhost:5062"
/** The `CI` variable, trimmed and in lower case, or "" when unset. */
const ciValue = process.env.CI?.trim().toLowerCase() ?? ""
/**
 * True in a CI run, which retries and writes reports for Azure DevOps. `CI=0`
 * and `CI=false` count as unset.
 */
export const isCI = ciValue !== "" && ciValue !== "0" && ciValue !== "false"
/** Where reports, traces and screenshots go. Git-ignored. */
export const outputDir = path.join(e2eDir, ".output")

/** A sign-in method that the tests run with, as one Playwright project. */
export interface E2EProvider {
  name: "microsoft" | "google"
  label: string
  testCv: string
  authFile: string
  channel?: string
  /** Matches the local-storage key that holds this method's signed-in session. */
  sessionKeyPattern: string
  /**
   * A persistent Chrome profile that keeps the provider's own sign-in. When
   * set, sessions are recorded in it, and the automatic renewal reopens it
   * instead of typing credentials.
   */
  profileDir?: string
}

/**
 * The folder for this machine's local e2e data outside the repository:
 * `%LOCALAPPDATA%\MyCV\e2e` on Windows, elsewhere under `~/.local/share`,
 * which cleanup tools leave alone, unlike a cache folder. Vite watches the
 * repository, and a file that Chrome locks there crashes the dev server.
 */
const localDataDir = path.join(
  process.env.LOCALAPPDATA?.trim() || path.join(homedir(), ".local", "share"),
  "MyCV",
  "e2e",
)

/**
 * The sign-in methods. Each one's saved session lives in `e2e/.auth`
 * (git-ignored), and its test CV address can be changed with an environment
 * variable. Google's sign-in page refuses Playwright's own Chromium, so the
 * session is recorded in Chrome, in a persistent profile: copied Google
 * cookies stop renewing the app's one-hour token once their short-lived
 * session cookies expire, while Chrome renews those in the profile itself.
 */
export const providers: E2EProvider[] = [
  {
    name: "microsoft",
    label: "Microsoft",
    testCv: process.env.E2E_MICROSOFT_CV?.trim() || "playwright-microsoft",
    authFile: path.join(e2eDir, ".auth", "microsoft.json"),
    sessionKeyPattern: String.raw`^msal\..*\|idtoken\|`,
  },
  {
    name: "google",
    label: "Google",
    testCv: process.env.E2E_GOOGLE_CV?.trim() || "playwright-google",
    authFile: path.join(e2eDir, ".auth", "google.json"),
    channel: "chrome",
    sessionKeyPattern: "^mycv-google-session$",
    profileDir: path.join(localDataDir, "google-profile"),
  },
]

/** Where a developer keeps `VITE_AUTH_STORAGE=local`: read by the dev server only, never by `vite build`. */
export const devEnvFile = "src/Frontend/.env.development.local"

/** What to do when a saved session is missing or no longer signs in. */
export const renewSessionHint = `Run \`npm --prefix src/Frontend run e2e:auth\` again. A dev server you started yourself at ${baseURL} needs VITE_AUTH_STORAGE=local in ${devEnvFile}.`
