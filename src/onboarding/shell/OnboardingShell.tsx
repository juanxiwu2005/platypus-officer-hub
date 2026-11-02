import { Link, Outlet } from "react-router-dom"
import { onboardingCopy } from "../copy"
export function OnboardingShell() { return <main className="ob-shell"><header className="ob-header"><Link to="/" className="brand">Platypus</Link><span className="ob-progress" aria-label="Walkthrough progress" /><Link className="btn small" to="/">{onboardingCopy.exit}</Link></header><Outlet /></main> }
