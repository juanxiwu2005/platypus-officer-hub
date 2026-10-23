import { Navigate, Route, Routes } from "react-router-dom"
import { Layout } from "./components/Layout"
import Today from "./pages/Today"
import Events from "./pages/Events"
import Tasks from "./pages/Tasks"
import Team from "./pages/Team"
import Funding from "./pages/Funding"
import Handoff from "./pages/Handoff"
import Partners from "./pages/Partners"
import Rules from "./pages/Rules"
import Settings from "./pages/Settings"
import Help from "./pages/Help"
import Officer from "./pages/Officer"
import Setup from "./pages/Setup"
import Join from "./pages/Join"

export default function App() {
  return (
    <Routes>
      <Route path="officer" element={<Officer />} />
      <Route path="join" element={<Join />} />
      <Route element={<Layout />}>
        <Route index element={<Today />} />
        <Route path="events" element={<Events />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="team" element={<Team />} />
        <Route path="funding" element={<Funding />} />
        <Route path="handoff" element={<Handoff />} />
        <Route path="partners" element={<Partners />} />
        <Route path="rules" element={<Rules />} />
        <Route path="settings" element={<Settings />} />
        <Route path="setup" element={<Setup />} />
        <Route path="help" element={<Help />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
