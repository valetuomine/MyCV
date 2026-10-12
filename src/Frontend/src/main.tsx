import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { MsalProvider } from "@azure/msal-react"
import { Provider as JotaiProvider } from "jotai"
import { Provider as ReduxProvider } from "react-redux"
import { BrowserRouter } from "react-router-dom"
import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "./index.css"
import App from "./pages/App.tsx"
import { msalInstance } from "./auth/entraAuth"
import { store } from "./state/store"

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
