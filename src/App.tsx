import { lazy, Suspense, type ReactNode } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { Layout } from "./components/Layout"
import { RouteLoading } from "./components/RouteLoading"
import Today from "./pages/Today"

// Keep Today and its interactions ready in the entry bundle. Other screens load on navigation.
const Events = lazy(() => import("./pages/Events"))
const Tasks = lazy(() => import("./pages/Tasks"))
const Team = lazy(() => import("./pages/Team"))
const Handoff = lazy(() => import("./pages/Handoff"))
const Partners = lazy(() => import("./pages/Partners"))
const Rules = lazy(() => import("./pages/Rules"))
const Settings = lazy(() => import("./pages/Settings"))
const Help = lazy(() => import("./pages/Help"))
const Officer = lazy(() => import("./pages/Officer"))
const Setup = lazy(() => import("./pages/Setup"))
const Join = lazy(() => import("./pages/Join"))
const PhaseOne = lazy(() => import("./phase1/PhaseOne"))

function screen(children: ReactNode, label: string, fullPage = false) {
  return <Suspense fallback={<RouteLoading label={label} fullPage={fullPage} />}>{children}</Suspense>
}

export default function App() {
  return (
    <Routes>
      <Route path="phase1/*" element={screen(<PhaseOne />, "Opening your workspace…", true)} />
      <Route path="officer" element={screen(<Officer />, "Opening your task…", true)} />
      <Route path="join" element={screen(<Join />, "Preparing your invitation…", true)} />
      <Route element={<Layout />}>
        <Route index element={<Today />} />
        <Route path="events" element={screen(<Events />, "Loading events…")} />
        <Route path="tasks" element={screen(<Tasks />, "Loading tasks…")} />
        <Route path="team" element={screen(<Team />, "Loading your team…")} />
        <Route path="funding" element={<Navigate to="/events" replace />} />
        <Route path="handoff" element={screen(<Handoff />, "Loading handoff…")} />
        <Route path="partners" element={screen(<Partners />, "Loading partners…")} />
        <Route path="rules" element={screen(<Rules />, "Loading rules…")} />
        <Route path="settings" element={screen(<Settings />, "Loading settings…")} />
        <Route path="setup" element={screen(<Setup />, "Preparing organization setup…")} />
        <Route path="help" element={screen(<Help />, "Loading help…")} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
