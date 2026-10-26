import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
// HashRouter keeps every page under /#/..., so Netlify never needs a catch-all redirect
// that could shadow /api/* or /legacy/ (plan §12).
import { HashRouter } from "react-router-dom"
import App from "./App"
import { StoreProvider } from "./data/store"
import { installSetupNavigationProtection } from "./organization/useSetupNavigationGuard"
import "./styles.css"

installSetupNavigationProtection()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </HashRouter>
    </StoreProvider>
  </StrictMode>,
)
