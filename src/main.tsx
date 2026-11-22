import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
// HashRouter keeps every page under /#/..., so Netlify never needs a catch-all redirect
// that could shadow /api/* or /legacy/ (plan §12).
import { HashRouter } from "react-router-dom"
import App from "./App"
import { StoreProvider } from "./data/store"
import { UiLogger } from "./components/UiLogger"
import "./styles.css"
import "./styles/index.css"

/**
 * Clear the saved demo without going through the store: when the saved state is the thing that
 * breaks rendering, no action can run. Every key this app writes starts with "platypus.".
 */
export function clearSavedDemo(): void {
  try {
    const keys = Object.keys(window.localStorage).filter(k => k.startsWith("platypus."))
    for (const k of keys) window.localStorage.removeItem(k)
  } catch {
    /* storage unavailable: a reload is all we can offer */
  }
}

/**
 * Without this, one render error is a white page, and damaged saved data makes every reload a
 * white page again. A participant would simply be stuck, so the reset here bypasses the store.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: unknown, info: ErrorInfo) { console.error("Platypus stopped:", error, info.componentStack) }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      // .shell.single: .shell is a two-column grid for the nav, and there is no nav here.
      <div className="shell single">
        <main id="main">
          <section className="card" role="alert" data-testid="app-error">
            <header><h2>Platypus could not open this page</h2></header>
            <p className="small">Something in the demo went wrong. Reload first. If reloading keeps failing, the saved demo data is damaged — reset it to start again from the example club.</p>
            <div className="action-row">
              <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Reload</button>
              <button type="button" className="btn" data-testid="error-reset" onClick={() => { clearSavedDemo(); window.location.reload() }}>Reset demo data</button>
            </div>
          </section>
        </main>
      </div>
    )
  }
}

// Guarded so a unit test can import ErrorBoundary from here without mounting the whole app.
// ErrorBoundary wraps App, so every page is covered.
const root = document.getElementById("root")
if (root) {
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <StoreProvider>
          <HashRouter>
            <UiLogger />
            <App />
          </HashRouter>
        </StoreProvider>
      </ErrorBoundary>
    </StrictMode>,
  )
}
