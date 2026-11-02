import { useEffect, type ReactNode } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { hasSeenWelcome } from "../../lib/onboardingRecord"
import { STORAGE_KEY } from "../../data/store"

export function WelcomeGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate(); const location = useLocation()
  useEffect(() => {
    const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    const enabled = env?.VITE_ONBOARDING_WALKTHROUGH === "true" || new URLSearchParams(location.search).get("walkthrough") === "1"
    if (!enabled || location.pathname !== "/" || hasSeenWelcome()) return
    try { if (window.localStorage.getItem(STORAGE_KEY)) return } catch { /* session fallback */ }
    navigate("/welcome", { replace: true })
  }, [location.pathname, location.search, navigate])
  return <>{children}</>
}
