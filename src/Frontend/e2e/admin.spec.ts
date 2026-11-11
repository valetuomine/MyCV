import type { Page } from "@playwright/test"
import { expect, expectSignedIn, test } from "./fixtures"

/** The warning that shows before signing in again leaves the page. */
const redirectWarning =
  "Signing in again reloads the page, so any changes you haven't saved are lost."
/** The error that shows when the API refuses a sign-in made right before. */
const sessionRefused = "Your sign-in still isn't accepted"
/** The sessionStorage key that marks a sign-in again awaiting the API's answer. */
const expiredSessionClearedKey = "mycv-expired-session-cleared"
/** The profile save request, `PUT /api/Profile/{id}`, without the admin look-up. */
const profileSaveUrl = "**/api/Profile/*"
/** The providers' interactive sign-in pages that a popup opens. */
const providerSignInPage =
  /\/oauth2\/v2\.0\/authorize|accounts\.google\.com\/o\/oauth2\//

/**
 * Keeps a sign-in popup on a blank page instead of the provider's sign-in
 * page, so the test user's provider session can't finish the sign-in by
 * itself and the test decides how the popup ends.
 *
 * @param page - The app's page, whose context opens the popup.
 */
async function holdSignInPopup(page: Page): Promise<void> {
  await page
    .context()
    .route(providerSignInPage, (route) =>
      route.fulfill({ contentType: "text/html", body: "<p>Sign-in</p>" }),
    )
}

/**
 * The signed-in views, run once per sign-in method with its saved session.
 * Only the method's own test CV is changed, and every run leaves it ready
 * for the next one.
 */
test.describe("signed-in user", () => {
  test("goes from /admin to managing the test CV", async ({ page, testCv }) => {
    await page.goto("/admin")
    await expectSignedIn(
      page,
      page.getByRole("button", { name: "Edit profile" }),
    )
    await expect(page).toHaveURL(new RegExp(`/${encodeURIComponent(testCv)}$`))
  })

  test("loads a signed-in page without an MSAL initialisation error", async ({
    page,
    testCv,
  }) => {
    const consoleErrors: string[] = []
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text())
      }
    })
    page.on("pageerror", (error) => consoleErrors.push(error.message))

    await page.goto(`/${encodeURIComponent(testCv)}`)
    await expectSignedIn(
      page,
      page.getByRole("button", { name: "Edit profile" }),
    )

    expect(
      consoleErrors.filter((text) =>
        text.includes("uninitialized_public_client_application"),
      ),
    ).toEqual([])
  })

  test("shows the create-profile form on /admin without a CV", async ({
    page,
  }) => {
    await page.route("**/api/me/candidate", (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/problem+json",
        json: { status: 404, title: "No CV is linked to this sign-in." },
      }),
    )

    await page.goto("/admin")
    await expectSignedIn(
      page,
      page.getByRole("heading", { name: "Create profile" }),
    )
    await expect(page.getByLabel("Your CV link")).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Create profile" }),
    ).toBeVisible()
  })

  test("offers to retry on /admin when the CV look-up fails", async ({
    page,
  }) => {
    await page.route("**/api/me/candidate", (route) =>
      route.fulfill({ status: 500 }),
    )

    await page.goto("/admin")
    await expectSignedIn(
      page,
      page.getByText("We couldn't check whether you already have a CV."),
    )
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Sign in again" }),
    ).toBeHidden()
  })

  test("offers to sign in again in a popup on /admin when the API refuses the session", async ({
    page,
  }) => {
    await holdSignInPopup(page)
    await page.route("**/api/me/candidate", (route) =>
      route.fulfill({ status: 401 }),
    )

    await page.goto("/admin")
    await expectSignedIn(page, page.getByText("Your sign-in has expired"))
    await expect(page.getByRole("button", { name: "Try again" })).toBeHidden()
    await expect(page.getByText(redirectWarning)).toBeHidden()

    const popupOpened = page.waitForEvent("popup")
    await page.getByRole("button", { name: "Sign in again" }).click()
    const popup = await popupOpened
    await page.getByRole("button", { name: "Cancel", exact: true }).click()
    await expect(
      page.getByText("Sign-in was cancelled. Your changes are still here."),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Sign in again" }),
    ).toBeEnabled()
    if (!popup.isClosed()) {
      await popup.close()
    }
  })

  test("keeps the unsaved changes when the API refuses a save", async ({
    page,
    testCv,
  }) => {
    const newName = `Playwright ${Date.now()}`
    const editButton = page.getByRole("button", { name: "Edit profile" })
    const fullName = page.getByLabel("Full name")
    const saveButton = page.getByRole("button", { name: "Save", exact: true })

    await page.goto(`/${encodeURIComponent(testCv)}`)
    await expectSignedIn(page, editButton)
    await editButton.click()
    await fullName.fill(newName)
    await page.route(profileSaveUrl, (route) =>
      route.request().method() === "PUT"
        ? route.fulfill({ status: 401 })
        : route.fallback(),
    )
    await saveButton.click()

    await expect(page.getByText("Your sign-in has expired")).toBeVisible()
    await expect(fullName).toBeHidden()
    await page.getByRole("button", { name: "Not now" }).click()
    await expect(fullName).toHaveValue(newName)

    await page.unroute(profileSaveUrl)
    await saveButton.click()
    await expect(page.getByText("Profile saved")).toBeVisible()
  })

  test("offers to sign in again when the API refuses the sign-in methods", async ({
    page,
    testCv,
  }) => {
    const editButton = page.getByRole("button", { name: "Edit profile" })

    let adminLoaded: Promise<unknown> = Promise.resolve()
    await page.route("**/api/me/logins", async (route) => {
      if (route.request().method() !== "GET") {
        await route.fallback()
        return
      }
      await adminLoaded
      await route.fulfill({ status: 401 })
    })
    await page.goto(`/${encodeURIComponent(testCv)}`)
    await expectSignedIn(page, editButton)
    adminLoaded = page.waitForResponse(
      (response) => response.url().endsWith("/admin") && response.ok(),
    )
    await editButton.click()

    await expect(page.getByText("Your sign-in has expired")).toBeVisible()
    await page.getByRole("button", { name: "Not now" }).click()
    await expect(
      page.getByRole("heading", { name: "Sign-in methods" }),
    ).toBeVisible()
  })

  test("shows an error instead of looping when the API refuses a fresh sign-in", async ({
    page,
  }) => {
    await page.addInitScript(
      (key) => sessionStorage.setItem(key, String(Date.now())),
      expiredSessionClearedKey,
    )
    await page.route("**/api/me/candidate", (route) =>
      route.fulfill({ status: 401 }),
    )

    await page.goto("/admin")
    await expectSignedIn(page, page.getByText(sessionRefused).first())
    await expect(
      page.getByRole("button", { name: "Sign in again" }),
    ).toBeHidden()
    await page.getByRole("button", { name: "Not now" }).click()
    await expect(page.getByText(sessionRefused)).toBeVisible()
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible()
  })

  test("forgets a sign-in again once the API answers 404 to it", async ({
    page,
  }) => {
    await page.addInitScript((key) => {
      if (!sessionStorage.getItem("e2e-marker-seeded")) {
        sessionStorage.setItem("e2e-marker-seeded", "true")
        sessionStorage.setItem(key, String(Date.now()))
      }
    }, expiredSessionClearedKey)
    await page.route("**/api/me/candidate", (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/problem+json",
        json: { status: 404, title: "No CV is linked to this sign-in." },
      }),
    )

    await page.goto("/admin")
    await expectSignedIn(
      page,
      page.getByRole("heading", { name: "Create profile" }),
    )
    await expect
      .poll(() =>
        page.evaluate(
          (key) => sessionStorage.getItem(key),
          expiredSessionClearedKey,
        ),
      )
      .toBeNull()
  })

  test.describe("with a real popup sign-in", () => {
    test.skip(
      ({ testCv }) => !testCv.includes("microsoft"),
      "Google's popup may ask for the account, and the tests never drive Google's pages.",
    )

    test("signs in again in a popup and saves the kept changes", async ({
      page,
      testCv,
    }) => {
      const newName = `Playwright ${Date.now()}`
      const editButton = page.getByRole("button", { name: "Edit profile" })
      const fullName = page.getByLabel("Full name")
      const saveButton = page.getByRole("button", {
        name: "Save",
        exact: true,
      })

      await page.goto(`/${encodeURIComponent(testCv)}`)
      await expectSignedIn(page, editButton)
      await editButton.click()
      await fullName.fill(newName)
      await page.route(
        profileSaveUrl,
        (route) =>
          route.request().method() === "PUT"
            ? route.fulfill({ status: 401 })
            : route.fallback(),
        { times: 1 },
      )
      await saveButton.click()
      await expect(page.getByText("Your sign-in has expired")).toBeVisible()

      await page.getByRole("button", { name: "Sign in again" }).click()
      await expect(page.getByText("Your sign-in has expired")).toBeHidden({
        timeout: 30_000,
      })
      await expect(fullName).toHaveValue(newName)
      await saveButton.click()
      await expect(page.getByText("Profile saved")).toBeVisible()
    })

    test("shows an error when the API refuses the popup sign-in too", async ({
      page,
    }) => {
      await page.route("**/api/me/candidate", (route) =>
        route.fulfill({ status: 401 }),
      )

      await page.goto("/admin")
      await expectSignedIn(page, page.getByText("Your sign-in has expired"))
      await page.getByRole("button", { name: "Sign in again" }).click()
      await expect(page.getByText(sessionRefused).first()).toBeVisible({
        timeout: 30_000,
      })
      await expect(
        page.getByRole("button", { name: "Sign in again" }),
      ).toBeHidden()
    })
  })

  test.describe("on a touch device", () => {
    test.use({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    })

    test("warns that unsaved changes are lost before signing in again on the page", async ({
      page,
    }) => {
      await page.route("**/api/me/candidate", (route) =>
        route.fulfill({ status: 401 }),
      )

      await page.goto("/admin")
      await expectSignedIn(page, page.getByText("Your sign-in has expired"))
      await expect(page.getByText(redirectWarning)).toBeVisible()
      await page.getByRole("button", { name: "Sign in again" }).click()
      await expect(
        page.getByRole("button", { name: /^Sign in with / }).first(),
      ).toBeVisible()
    })
  })

  test("goes from the home page link to managing the test CV", async ({
    page,
    testCv,
  }) => {
    await page.goto("/")
    await page.getByRole("link", { name: "Manage your CV" }).click()
    await expectSignedIn(
      page,
      page.getByRole("button", { name: "Edit profile" }),
    )
    await expect(page).toHaveURL(new RegExp(`/${encodeURIComponent(testCv)}$`))
  })

  test("edits and saves the test CV", async ({ page, testCv }) => {
    const newName = `Playwright ${Date.now()}`
    const editButton = page.getByRole("button", { name: "Edit profile" })

    await page.goto(`/${encodeURIComponent(testCv)}`)
    await expectSignedIn(page, editButton)
    await editButton.click()
    await page.getByLabel("Full name").fill(newName)
    await page.getByRole("button", { name: "Save", exact: true }).click()
    await expect(page.getByText("Profile saved")).toBeVisible()

    await page.reload()
    await expectSignedIn(page, editButton)
    await editButton.click()
    await expect(page.getByLabel("Full name")).toHaveValue(newName)
  })

  test("lists the sign-in methods", async ({ page, testCv }) => {
    const editButton = page.getByRole("button", { name: "Edit profile" })

    await page.goto(`/${encodeURIComponent(testCv)}`)
    await expectSignedIn(page, editButton)
    await editButton.click()
    await expect(
      page.getByRole("heading", { name: "Sign-in methods" }),
    ).toBeVisible()
    await expect(page.getByText("This session")).toBeVisible()
  })

  test("signs out", async ({ page, testCv }) => {
    const signOutButton = page.getByRole("button", { name: /^Sign out of / })

    await page.goto(`/${encodeURIComponent(testCv)}`)
    await expectSignedIn(page, signOutButton)
    await signOutButton.click()
    await expect(page.getByText("You've signed out")).toBeVisible({
      timeout: 15_000,
    })
    await expect(signOutButton).toBeHidden()
  })
})
