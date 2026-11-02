import { lazy, Suspense, type ReactNode } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { Layout } from "./components/Layout"
import { OnboardingShell } from "./onboarding/shell/OnboardingShell"
import { ComingSoon } from "./onboarding/gate/ComingSoon"
import { OnboardingDraftProvider } from "./onboarding/draft"
import { Name } from "./onboarding/founder/Name"
import { Constitution } from "./onboarding/founder/Constitution"
import { Goals } from "./onboarding/founder/Goals"
import { Team as OnboardingTeam } from "./onboarding/founder/Team"
import { FirstEvent } from "./onboarding/founder/FirstEvent"
import { Confirm } from "./onboarding/founder/Confirm"
import { Invite } from "./onboarding/founder/Invite"
import { Invitation } from "./onboarding/member/Invitation"
import { You } from "./onboarding/member/You"
import { Reminders } from "./onboarding/member/Reminders"
import { BusyWeeks } from "./onboarding/member/BusyWeeks"
import { About } from "./onboarding/member/About"
import { Done } from "./onboarding/member/Done"
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
      <Route path="welcome" element={<OnboardingDraftProvider><OnboardingShell /></OnboardingDraftProvider>}>
        <Route index element={<ComingSoon />} /><Route path="classic" element={screen(<Setup />, "Preparing organization setup…", true)} /><Route path="classic-join" element={screen(<Join />, "Preparing your invitation…", true)} />
        <Route path="founder/name" element={<Name />} /><Route path="founder/constitution" element={<Constitution />} /><Route path="founder/goals" element={<Goals />} /><Route path="founder/team" element={<OnboardingTeam />} /><Route path="founder/first-event" element={<FirstEvent />} /><Route path="founder/confirm" element={<Confirm />} /><Route path="founder/invite" element={<Invite />} />
        <Route path="member/invitation" element={<Invitation />} /><Route path="member/you" element={<You />} /><Route path="member/reminders" element={<Reminders />} /><Route path="member/busy-weeks" element={<BusyWeeks />} /><Route path="member/about" element={<About />} /><Route path="member/done" element={<Done />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>
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
