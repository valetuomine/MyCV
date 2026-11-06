import { existsSync } from "node:fs"
import { expectSignedIn, test as setup } from "./fixtures"
import { renewSessionHint } from "./settings"
import { assertTestAccount } from "./testAccount"

/**
 * Runs before each sign-in method's tests: checks on `/admin` that its saved
 * session belongs to a test user, then on the test CV, where the app renews
 * the tokens, that the session still signs in. It creates the method's own
 * test CV when it is missing, so the tests never depend on data that already
 * exists. It then saves the session again, with the tokens and provider
 * cookies that the app renewed silently, so a session used regularly lasts
 * longer than its first tokens.
 * It saves only a Playwright test user's session.
 */
setup(
  "saved session signs in and the test CV exists",
  async ({ page, testCv, authFile }) => {
    setup.skip(!testCv, "No test CV configured for this project.")
    if (!existsSync(authFile)) {
      throw new Error(`No saved session at ${authFile}. ${renewSessionHint}`)
    }

    const createButton = page.getByRole("button", { name: "Create profile" })
    await page.goto("/admin")
    await expectSignedIn(page, createButton)
    await assertTestAccount(page)

    await page.goto(`/${encodeURIComponent(testCv)}`)
    const editButton = page.getByRole("button", { name: "Edit profile" })
    /** Shows when the test CV doesn't exist yet. */
    const missingCv = page
      .getByText("This candidate does not have a profile yet.")
      .or(page.getByText("We couldn't find that CV."))
    await expectSignedIn(page, editButton.or(missingCv).first())

    if (await missingCv.first().isVisible()) {
      await page.goto("/admin")
      await page.getByLabel("Your CV link").fill(testCv)
      await page.getByLabel("Full name").fill("Playwright")
      await page
        .getByLabel("Professional title (Finnish)")
        .fill("Testiprofiili")
      await createButton.click()
      await page.waitForURL(`**/${encodeURIComponent(testCv)}`)
    }

    await expectSignedIn(page, editButton)
    await page.context().storageState({ path: authFile })
  },
)
