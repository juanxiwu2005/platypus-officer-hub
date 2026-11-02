import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component, StrictMode } from "react";
import { createRoot } from "react-dom/client";
// HashRouter keeps every page under /#/..., so Netlify never needs a catch-all redirect
// that could shadow /api/* or /legacy/ (plan §12).
import { HashRouter } from "react-router-dom";
import App from "./App";
import { StoreProvider } from "./data/store";
import { installSetupNavigationProtection } from "./organization/useSetupNavigationGuard";
import "./styles.css";
import "./styles/index.css";
/**
 * Clear the saved demo without going through the store: when the saved state is the thing that
 * breaks rendering, no action can run. Every key this app writes starts with "platypus.".
 */
export function clearSavedDemo() {
    try {
        const keys = Object.keys(window.localStorage).filter(k => k.startsWith("platypus."));
        for (const k of keys)
            window.localStorage.removeItem(k);
    }
    catch {
        /* storage unavailable: a reload is all we can offer */
    }
}
/**
 * Without this, one render error is a white page, and damaged saved data makes every reload a
 * white page again. A participant would simply be stuck, so the reset here bypasses the store.
 */
export class ErrorBoundary extends Component {
    constructor() {
        super(...arguments);
        this.state = { failed: false };
    }
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(error, info) { console.error("Platypus stopped:", error, info.componentStack); }
    render() {
        if (!this.state.failed)
            return this.props.children;
        return (_jsx("div", { className: "shell single", children: _jsx("main", { id: "main", children: _jsxs("section", { className: "card", role: "alert", "data-testid": "app-error", children: [_jsx("header", { children: _jsx("h2", { children: "Platypus could not open this page" }) }), _jsx("p", { className: "small", children: "Something in the demo went wrong. Reload first. If reloading keeps failing, the saved demo data is damaged \u2014 reset it to start again from the example club." }), _jsxs("div", { className: "action-row", children: [_jsx("button", { type: "button", className: "btn btn-primary", onClick: () => window.location.reload(), children: "Reload" }), _jsx("button", { type: "button", className: "btn", "data-testid": "error-reset", onClick: () => { clearSavedDemo(); window.location.reload(); }, children: "Reset demo data" })] })] }) }) }));
    }
}
// Guarded so a unit test can import ErrorBoundary from here without mounting the whole app.
// ErrorBoundary wraps App, so the main pages and /#/phase1/ are both covered.
const root = document.getElementById("root");
if (root) {
    installSetupNavigationProtection();
    createRoot(root).render(_jsx(StrictMode, { children: _jsx(ErrorBoundary, { children: _jsx(StoreProvider, { children: _jsx(HashRouter, { children: _jsx(App, {}) }) }) }) }));
}
