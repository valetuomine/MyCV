import { defineConfig, devices } from "@playwright/test"
import { existsSync } from "node:fs"
import path from "node:path"
import type { TestOptions } from "./e2e/fixtures"
import { basePort, baseURL, isCI, outputDir, providers } from "./e2e/settings"

/**
 * Playwright end-to-end tests. Each sign-in method is a project that loads
 * its saved session (`npm run e2e:auth` records them) and runs after its
 * `-setup` project, which checks the session and creates the test CV. The
 * tests run only against a local frontend and the local API on port 5062,
 * which must be running with its database.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig<TestOptions>({
  testDir: "./e2e",
  outputDir: path.join(outputDir, "test-results"),
  globalSetup: "./e2e/global.setup.ts",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: path.join(outputDir, "report"), open: "never" }],
    ...(isCI
      ? [["junit", { outputFile: path.join(outputDir, "junit.xml") }] as const]
      : []),
  ],
  use: {
    baseURL,
    locale: "en-US",
    trace: isCI ? "on-first-retry" : "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: providers.flatMap((provider) => {
    /** The project's browser, session and test CV. */
    const use = {
      ...devices["Desktop Chrome"],
      storageState: provider.authFile,
      testCv: provider.testCv,
      authFile: provider.authFile,
    }

    return [
      {
        name: `${provider.name}-setup`,
        testMatch: /session\.setup\.ts/,
        use: {
          ...use,
          storageState: existsSync(provider.authFile)
            ? provider.authFile
            : undefined,
        },
      },
      {
        name: provider.name,
        testMatch: /\.spec\.ts/,
        dependencies: [`${provider.name}-setup`],
        use,
      },
    ]
  }),
  webServer: {
    command: `npm run dev -- --port ${basePort} --strictPort --no-open`,
    url: baseURL,
    reuseExistingServer: !isCI,
    env: { VITE_AUTH_STORAGE: "local" },
    timeout: 60_000,
  },
})
