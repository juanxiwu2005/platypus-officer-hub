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
import { ReminderMode } from "./onboarding/founder/ReminderMode"
import { Confirm } from "./onboarding/founder/Confirm"
import { Invite } from "./onboarding/founder/Invite"
import { Invitation } from "./onboarding/member/Invitation"
import { You } from "./onboarding/member/You"
import { Reminders } from "./onboarding/member/Reminders"
import { BusyWeeks } from "./onboarding/member/BusyWeeks"
import { About } from "./onboarding/member/About"
import { Done } from "./onboarding/member/Done"
import { Welcome } from "./onboarding/gate/Welcome"
import { WelcomeGate } from "./onboarding/gate/WelcomeGate"
import { StartWalkthrough } from "./onboarding/gate/StartWalkthrough"
import { TestWalkthrough } from "./onboarding/gate/TestWalkthrough"
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
const SetupEntry = lazy(() => import("./onboarding/gate/SetupEntry"))
const Join = lazy(() => import("./pages/Join"))
const Quest = lazy(() => import("./quest/sample/Sample"))
const PhaseOne = lazy(() => import("./phase1/PhaseOne"))

function screen(children: ReactNode, label: string, fullPage = false) {
  return <Suspense fallback={<RouteLoading label={label} fullPage={fullPage} />}>{children}</Suspense>
}

export default function App() {
  return (
    <Routes>
      <Route path="welcome" element={<OnboardingDraftProvider><OnboardingShell /></OnboardingDraftProvider>}>
        <Route index element={<Welcome />} /><Route path="start" element={<StartWalkthrough />} /><Route path="test/president" element={<TestWalkthrough to="/welcome/founder/name" />} /><Route path="test/invite" element={<TestWalkthrough to="/welcome/member/invitation" />} /><Route path="setup" element={screen(<SetupEntry />, "Preparing organization setup…", true)} /><Route path="classic" element={<Navigate to="/welcome/setup" replace />} /><Route path="classic-join" element={screen(<Join />, "Preparing your invitation…", true)} />
        <Route path="founder/name" element={<Name />} /><Route path="founder/constitution" element={<Constitution />} /><Route path="founder/goals" element={<Goals />} /><Route path="founder/team" element={<OnboardingTeam />} /><Route path="founder/first-event" element={<FirstEvent />} /><Route path="founder/reminders" element={<ReminderMode />} /><Route path="founder/confirm" element={<Confirm />} /><Route path="founder/invite" element={<Invite />} />
        <Route path="member/invitation" element={<Invitation />} /><Route path="member/you" element={<You />} /><Route path="member/reminders" element={<Reminders />} /><Route path="member/busy-weeks" element={<BusyWeeks />} /><Route path="member/about" element={<About />} /><Route path="member/done" element={<Done />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>
      {/* The short study link (Phase 3): /#/start does exactly what /welcome/start does: one recorded attempt, then the founder name screen.
          Each hop replaces the history entry, so a reload on that screen or the browser's Back never starts a second attempt. */}
      <Route path="start" element={<Navigate to="/welcome/start" replace />} />
      <Route path="setup" element={<Navigate to="/welcome/setup" replace />} />
      <Route path="quest" element={screen(<Quest />, "Opening Speaker Night…", true)} />
      <Route path="phase1/*" element={screen(<PhaseOne />, "Opening your workspace…", true)} />
      <Route path="officer" element={screen(<Officer />, "Opening your task…", true)} />
      <Route path="join" element={screen(<Join />, "Preparing your invitation…", true)} />
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
