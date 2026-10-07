import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Provider as JotaiProvider } from "jotai"
import { Provider as ReduxProvider } from "react-redux"
import { BrowserRouter } from "react-router-dom"
import "./index.css"
import App from "./pages/App.tsx"
import { store } from "./state/store"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ReduxProvider store={store}>
      <JotaiProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </JotaiProvider>
    </ReduxProvider>
  </StrictMode>,
)
