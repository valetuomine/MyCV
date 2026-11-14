import type { BrowserContext, Page } from "@playwright/test"
import { expect, expectSignedIn, test } from "./fixtures"

/**
 * Opens another tab of the app in the same browser context, in English like
 * the test's own page.
 *
 * @param context - The browser context whose session the tab shares.
 * @returns The new tab.
 */
async function openTab(context: BrowserContext): Promise<Page> {
  const tab = await context.newPage()
  await tab.addInitScript(() =>
    localStorage.setItem("cv-language", JSON.stringify("en")),
  )
  return tab
}

/**
 * Finds the button that edits the CV, which shows only when signed in.
 *
 * @param page - The tab to look in.
 * @returns The Edit profile button.
 */
function editButton(page: Page) {
  return page.getByRole("button", { name: "Edit profile" })
}

/**
 * Finds the navigation's sign-out button.
 *
 * @param page - The tab to look in.
 * @returns The sign-out button.
 */
function signOutButton(page: Page) {
  return page.getByRole("button", { name: /^Sign out of / })
}

/**
 * The sign-in shared by the app's tabs in one browser, run once per sign-in
 * method with its saved session. A test's context is its browser, so signing
 * out in it never touches the saved session.
 */
test.describe("session shared by the tabs", () => {
  test("shows a new tab signed in", async ({ page, context, testCv }) => {
    const cvPath = `/${encodeURIComponent(testCv)}`
    await page.goto(cvPath)
    await expectSignedIn(page, editButton(page))

    const tab = await openTab(context)
    await tab.goto(cvPath)
    await expectSignedIn(tab, editButton(tab))
  })

  test("signs out the other tab with the sign-out notice", async ({
    page,
    context,
    testCv,
  }) => {
    const cvPath = `/${encodeURIComponent(testCv)}`
    await page.goto(cvPath)
    await expectSignedIn(page, signOutButton(page))
    const tab = await openTab(context)
    await tab.goto(cvPath)
    await expectSignedIn(tab, signOutButton(tab))

    await signOutButton(page).click()

    await expect(tab.getByText("You've signed out")).toBeVisible({
      timeout: 15_000,
    })
    await expect(signOutButton(tab)).toBeHidden()
    await expect(page.getByText("You've signed out")).toBeVisible({
      timeout: 15_000,
    })
  })

  test("asks for sign-in again once the browser has closed", async ({
    page,
    context,
    browser,
    baseURL,
    testCv,
  }) => {
    await page.goto(`/${encodeURIComponent(testCv)}`)
    await expectSignedIn(page, editButton(page))
    const state = await context.storageState()

    const reopened = await browser.newContext({
      baseURL,
      locale: "en-US",
      storageState: {
        ...state,
        cookies: state.cookies.filter((cookie) => cookie.expires !== -1),
      },
    })
    try {
      const tab = await openTab(reopened)
      await tab.goto("/admin")

      await expect(
        tab.getByRole("button", { name: /^Sign in with / }).first(),
      ).toBeVisible({ timeout: 20_000 })
      await expect
        .poll(() =>
          tab.evaluate(() => localStorage.getItem("mycv-google-session")),
        )
        .toBeNull()
    } finally {
      await reopened.close()
    }
  })
})
