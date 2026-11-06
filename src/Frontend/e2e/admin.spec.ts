import { expect, expectSignedIn, test } from "./fixtures"

/**
 * The signed-in views, run once per sign-in method with its saved session.
 * Only the method's own test CV is changed, and every run leaves it ready
 * for the next one.
 */
test.describe("signed-in user", () => {
  test("opens the create-profile view", async ({ page }) => {
    await page.goto("/admin")
    await expectSignedIn(
      page,
      page.getByRole("heading", { name: "Create profile" }),
    )
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
