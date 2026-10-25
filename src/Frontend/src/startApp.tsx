import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { MsalProvider } from "@azure/msal-react"
import { Provider as JotaiProvider } from "jotai"
import { Provider as ReduxProvider } from "react-redux"
import { BrowserRouter } from "react-router-dom"
import App from "./pages/App.tsx"
import { msalInstance } from "./auth/entraAuth"
import { store } from "./state/store"

/** Renders the app. `main.tsx` loads this module for every page load that isn't a sign-in popup. */
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
