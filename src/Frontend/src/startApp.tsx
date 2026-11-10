import "./i18n/i18n"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { MsalProvider } from "@azure/msal-react"
import { Provider as JotaiProvider } from "jotai"
import { Provider as ReduxProvider } from "react-redux"
import { BrowserRouter } from "react-router-dom"
import App from "./pages/App.tsx"
import { msalInstance } from "./auth/entraAuth"
import { store } from "./state/store"

/**
 * Initialises MSAL, then renders the app. MSAL refuses every call before
 * `initialize()` completes, and the app's first API request asks it for a
 * token as soon as the app renders, so rendering waits for it. A failed
 * initialisation is logged and the app renders anyway, so the public CV
 * still loads. `main.tsx` loads this module for every page load that isn't a
 * sign-in popup.
 */
async function startApp(): Promise<void> {
  try {
    await msalInstance.initialize()
  } catch (error) {
    console.error("MSAL initialisation failed", error)
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <ReduxProvider store={store}>
          <JotaiProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </JotaiProvider>
        </ReduxProvider>
      </MsalProvider>
    </StrictMode>,
  )
}

startApp().catch((error: unknown) => {
  console.error("The app failed to start", error)
})
