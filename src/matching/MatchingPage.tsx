import { useMemo } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useStore } from "../data/store"
import { canLead, isOfficer } from "../data/permissions"
import type { MatchingSetupInitial } from "./setupContracts"
import { createMatchingExample } from "./examples"
import { setupId } from "./setupWorkspace"
import { useMatchingSetup } from "./useMatchingSetup"
import MatchingSetupView from "./ui/MatchingSetupView"

export default function MatchingPage() {
  const { state } = useStore(), [params] = useSearchParams()
  const example = params.get("example") === "1", separate = params.get("preview") ?? ""
  const initial = useMemo<MatchingSetupInitial>(() => {
    if (example) {
      const sample = createMatchingExample()
      return { references: sample.references, memberships: sample.state.memberships, matching: sample.state, contextKey: "fictional-robotics-example" }
    }
    const roles = state.roles.map(r => ({ id: r.id, title: r.displayName }))
    const members = state.people.map(p => ({ id: p.id, name: p.name, active: isOfficer(p), availability: "unknown" as const, qualifications: {} }))
    // Team input is copied into a separate preview. A different legacy setup cannot inherit its receipts.
    const contextKey = JSON.stringify([state.org.id, state.org.name, state.org.setupCompletedOn, [...roles.map(r => r.id)].sort(), state.people.map(p => [p.id, p.roleId, p.leftOn ?? null, p.incomingFor ?? null]).sort(), separate])
    return { contextKey, references: { organizationId: state.org.id, roles, members }, memberships: state.people.filter(p => roles.some(r => r.id === p.roleId)).map(p => ({ id: `snapshot-${p.id}`, memberId: p.id, roleId: p.roleId, confirmed: true })) }
  }, [state.org.id, state.org.name, state.org.setupCompletedOn, state.roles, state.people, example, separate])
  return <MatchingSession key={initial.contextKey} initial={initial} actorId={state.viewerId} canEdit={canLead(state) && state.people.some(p => p.id === state.viewerId && isOfficer(p))} aiEnabled={state.aiEnabled} />
}

function MatchingSession({ initial, actorId, canEdit, aiEnabled }: { initial: MatchingSetupInitial; actorId: string; canEdit: boolean; aiEnabled: boolean }) {
  const controller = useMatchingSetup(initial, actorId, canEdit, undefined, aiEnabled), navigate = useNavigate()
  if (!controller.document) return <section className="card form-stack">
    <h1>Responsibility setup could not open</h1>
    <p role="alert">{controller.error}</p>
    <p>Your saved preview has been kept. Download it before creating a separate preview.</p>
    <div className="action-row">
      <button type="button" className="btn" disabled={!controller.recoveryRaw} onClick={controller.onExport}>Download saved preview</button>
      {canEdit && <button type="button" className="btn" onClick={() => navigate(`/matching?preview=${setupId()}`)}>Create a separate preview</button>}
      <Link className="btn" to="/team">Back to Team</Link>
    </div>
  </section>
  return <MatchingSetupView {...controller} document={controller.document} onExample={() => navigate("/matching?example=1")} />
}
