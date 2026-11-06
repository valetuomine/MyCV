import { assertTestDevServer } from "./devServer"
import { apiURL } from "./settings"

/**
 * Checks once before the run that the local API answers, because the
 * frontend that Playwright starts only proxies `/api` to it. A redirect
 * counts, because the API's `https` launch profile redirects to HTTPS. The
 * health endpoint doesn't reach the database, so a missing database shows
 * only when a test saves. Then checks that the frontend, which Playwright
 * starts before this, keeps sessions in local storage and calls a local API.
 */
export default async function globalSetup(): Promise<void> {
  const healthUrl = `${apiURL}/api/health`
  /** True when the health endpoint answers with success or a redirect. */
  const isUp = await fetch(healthUrl, { redirect: "manual" })
    .then((response) => response.status >= 200 && response.status < 400)
    .catch(() => false)

  if (!isUp) {
    throw new Error(
      `The local API doesn't answer at ${healthUrl}. Start it and its database first: dotnet run --project src/Backend/CV.WebApi --launch-profile http`,
    )
  }
  await assertTestDevServer()
}
