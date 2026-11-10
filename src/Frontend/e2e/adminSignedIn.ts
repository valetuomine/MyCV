import type { Locator, Page } from "@playwright/test"

/**
 * Finds what shows once the app is signed in on `/admin`: the create form's
 * button, or, for a user who has a CV, the edit button on the CV that
 * `/admin` sends them on to.
 *
 * @param page - The app's page.
 * @returns The "Create profile" or the "Edit profile" button.
 */
export function adminSignedInButton(page: Page): Locator {
  return page
    .getByRole("button", { name: "Create profile" })
    .or(page.getByRole("button", { name: "Edit profile" }))
    .first()
}
