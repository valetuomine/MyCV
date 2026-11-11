import { expect, test } from "./fixtures"

/**
 * MSAL's hidden iframe for a silent Microsoft token renewal. The callback
 * route loaded in a frame must hand Microsoft's response to the tab on the
 * `BroadcastChannel` named in the response's state, through MSAL's redirect
 * bridge, and must not start the app. The test fakes the response, so it
 * needs neither Microsoft nor the API's answer.
 */
test.describe("silent Microsoft token renewal", () => {
  test("hands the response from the callback iframe to the tab without starting the app", async ({
    page,
  }) => {
    await page.goto("/")

    /** The app modules that frames other than the tab requested. */
    const appRequestsFromFrames: string[] = []
    page.on("request", (request) => {
      if (
        request.frame() !== page.mainFrame() &&
        /startApp|App\.tsx/.test(new URL(request.url()).pathname)
      ) {
        appRequestsFromFrames.push(request.url())
      }
    })

    const message = await page.evaluate(async () => {
      const id = crypto.randomUUID()
      const state = btoa(
        JSON.stringify({ id, meta: { interactionType: "silent" } }),
      )
      const channel = new BroadcastChannel(id)
      const received = new Promise<unknown>((resolve) => {
        channel.onmessage = (event: MessageEvent) => resolve(event.data)
      })
      const frame = document.createElement("iframe")
      frame.src = `/auth/callback#code=x&state=${encodeURIComponent(state)}`
      document.body.append(frame)
      const data = await received
      channel.close()
      return data
    })

    expect(message).toEqual({
      v: 1,
      payload: expect.stringContaining("code=x"),
    })

    const frame = page
      .frames()
      .find((candidate) =>
        new URL(candidate.url()).pathname.endsWith("/auth/callback"),
      )
    if (!frame) {
      throw new Error("The callback iframe was not found")
    }

    await frame.waitForLoadState("networkidle")
    expect(appRequestsFromFrames).toEqual([])
    await expect(frame.locator("#root > *")).toHaveCount(0)
  })
})
