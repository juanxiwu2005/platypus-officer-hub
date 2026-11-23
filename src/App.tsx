import { lazy, Suspense, type ReactNode } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { Layout } from "./components/Layout"
import { OnboardingShell } from "./onboarding/shell/OnboardingShell"
import { OnboardingDraftProvider } from "./onboarding/draft"
import { Name } from "./onboarding/founder/Name"
import { Team as OnboardingTeam } from "./onboarding/founder/Team"
import { Invite } from "./onboarding/founder/Invite"
import { Invitation } from "./onboarding/member/Invitation"
import { Reminders } from "./onboarding/member/Reminders"
import { BusyWeeks } from "./onboarding/member/BusyWeeks"
import { Done } from "./onboarding/member/Done"
import { Welcome } from "./onboarding/gate/Welcome"
import { WelcomeGate } from "./onboarding/gate/WelcomeGate"
import { StartWalkthrough } from "./onboarding/gate/StartWalkthrough"
import { TestWalkthrough } from "./onboarding/gate/TestWalkthrough"
import { Redirect } from "./onboarding/gate/Redirect"
import { FOUNDER_START } from "./onboarding/target"
import { RouteLoading } from "./components/RouteLoading"
import Today from "./pages/Today"

// Keep Today and its interactions ready in the entry bundle. Other screens load on navigation.
const Events = lazy(() => import("./pages/Events"))
const Tasks = lazy(() => import("./pages/Tasks"))
const Team = lazy(() => import("./pages/Team"))
const Handoff = lazy(() => import("./pages/Handoff"))
const Rules = lazy(() => import("./pages/Rules"))
const Settings = lazy(() => import("./pages/Settings"))
const Help = lazy(() => import("./pages/Help"))
const Officer = lazy(() => import("./pages/Officer"))

function screen(children: ReactNode, label: string, fullPage = false) {
  return <Suspense fallback={<RouteLoading label={label} fullPage={fullPage} />}>{children}</Suspense>
}

export default function App() {
  return (
    <Routes>
      <Route path="welcome" element={<OnboardingDraftProvider><OnboardingShell /></OnboardingDraftProvider>}>
        <Route index element={<Welcome />} /><Route path="start" element={<StartWalkthrough />} /><Route path="test/president" element={<TestWalkthrough to={FOUNDER_START} />} /><Route path="test/invite" element={<TestWalkthrough to="/welcome/member/invitation" />} />
        <Route path="founder/name" element={<Name />} /><Route path="founder/team" element={<OnboardingTeam />} /><Route path="founder/invite" element={<Invite />} />
        <Route path="member/invitation" element={<Invitation />} /><Route path="member/reminders" element={<Reminders />} /><Route path="member/busy-weeks" element={<BusyWeeks />} /><Route path="member/done" element={<Done />} />
        {/* ob-6 (S6, 2026-11-23): old addresses go to the screen that now does their job. Setup doors that are not the study link record nothing.
            Constitution, Goals, the old Reminders screen and Confirm fold into Team; First event is on the first screen; You is on Invitation;
            About you led to Done. The classic setup and join pages, the legacy-draft importer and the "Coming soon" page are gone. */}
        <Route path="setup" element={<Redirect to={FOUNDER_START} outside />} /><Route path="classic" element={<Redirect to={FOUNDER_START} outside />} /><Route path="classic-join" element={<Redirect to="/welcome/member/invitation" keepQuery />} />
        <Route path="founder/constitution" element={<Redirect to="/welcome/founder/team" />} /><Route path="founder/goals" element={<Redirect to="/welcome/founder/team" />} /><Route path="founder/first-event" element={<Redirect to={FOUNDER_START} />} /><Route path="founder/reminders" element={<Redirect to="/welcome/founder/team" />} /><Route path="founder/confirm" element={<Redirect to="/welcome/founder/team" />} />
        <Route path="member/you" element={<Redirect to="/welcome/member/invitation" keepQuery />} /><Route path="member/about" element={<Redirect to="/welcome/member/done" />} />
        <Route path="*" element={<Redirect to="/welcome" />} />
      </Route>
      {/* The short study link (Phase 3): /#/start does exactly what /welcome/start does: one recorded attempt, then the founder name screen.
          Each hop replaces the history entry, so a reload on that screen or the browser's Back never starts a second attempt. */}
      <Route path="start" element={<Navigate to="/welcome/start" replace />} />
      <Route path="setup" element={<Navigate to="/welcome/setup" replace />} />
      <Route path="officer" element={screen(<Officer />, "Opening your task…", true)} />
      {/* Invitation links (Settings and Invite share /join?invite=…) open the member walkthrough; the query is kept. */}
      <Route path="join" element={<Redirect to="/welcome/member/invitation" keepQuery />} />
      <Route element={<Layout />}>
        <Route index element={<WelcomeGate><Today /></WelcomeGate>} />
        <Route path="events" element={screen(<Events />, "Loading events…")} />
        <Route path="tasks" element={screen(<Tasks />, "Loading tasks…")} />
        <Route path="team" element={screen(<Team />, "Loading your team…")} />
        <Route path="matching" element={<Navigate to="/settings" replace />} />
        <Route path="funding" element={<Navigate to="/events" replace />} />
        <Route path="handoff" element={screen(<Handoff />, "Loading handoff…")} />
        {/* Partners is temporarily archived; old bookmarks return to the main workspace. */}
        <Route path="partners/*" element={<Navigate to="/" replace />} />
        <Route path="rules" element={screen(<Rules />, "Loading rules…")} />
        <Route path="settings" element={screen(<Settings />, "Loading settings…")} />
        <Route path="help" element={screen(<Help />, "Loading help…")} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
