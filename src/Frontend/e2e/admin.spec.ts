import { expect, expectSignedIn, test } from "./fixtures"

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
