import { useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useStore } from "../data/store"
import { canLead, isOfficer } from "../data/permissions"
import type { MatchingSetupInitial } from "./setupContracts"
import { createMatchingExample } from "./examples"
import { setupId } from "./setupWorkspace"
import { useMatchingSetup } from "./useMatchingSetup"
import MatchingSetupView from "./ui/MatchingSetupView"
import { matchingSetupContext } from "./setupContext"
import { importOrganizationMatching, organizationSetupDocument } from "./organizationMatching"
import { matchingModeEnabled, WorkflowResponsibilityMap } from "./adapters"
import { parseSetupDocument } from "./setupWorkspace"
import type { MatchingStorage } from "./contracts"
import type { DemoState } from "../data/types"

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
    const contextKey = matchingSetupContext(state, separate)
    return { contextKey, references: { organizationId: state.org.id, roles, members }, memberships: state.people.filter(p => roles.some(r => r.id === p.roleId)).map(p => ({ id: `snapshot-${p.id}`, memberId: p.id, roleId: p.roleId, confirmed: true })) }
  }, [state.org.id, state.org.name, state.org.setupCompletedOn, state.org.inviteCode, state.roles, state.people, example, separate])
  const canEdit = canLead(state) && state.people.some(p => p.id === state.viewerId && isOfficer(p))
  if (!example && !separate && params.get("draft") !== "1" && state.matching !== undefined) return <OrganizationMatchingPage key={state.org.matchingWorkspaceId ?? "invalid"} canEdit={canEdit} />
  return <MatchingSession key={initial.contextKey} initial={initial} actorId={state.viewerId} canEdit={canEdit} aiEnabled={state.aiEnabled} />
}

function MatchingSession({ initial, actorId, canEdit, aiEnabled }: { initial: MatchingSetupInitial; actorId: string; canEdit: boolean; aiEnabled: boolean }) {
  const controller = useMatchingSetup(initial, actorId, canEdit, undefined, aiEnabled), navigate = useNavigate()
  const { getState, tryDispatch } = useStore()
  const [problem, setProblem] = useState("")
  const enable = (importPreview: boolean) => {
    try {
      if (importPreview && controller.document?.id === getState().matchingContext?.importedPreviewId) { navigate("/matching"); return }
      if (importPreview && controller.document) importOrganizationMatching(getState(), controller.document)
      const success = importPreview && controller.document ? tryDispatch({ type: "matchingImport", preview: controller.document }) : tryDispatch({ type: "matchingInitialize" })
      if (!success) { setProblem("The library could not be saved. Export your data before retrying; existing tasks have not changed."); return }
      navigate("/matching")
    } catch (error) { setProblem(error instanceof Error ? error.message : "The preview could not be imported.") }
  }
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
  return <>
    <section className="card form-stack" aria-label="Use responsibility matching">
      <h2>Use responsibilities for actual tasks</h2>
      <p>Review this preview, then import its library for new tasks. Existing owners and task statuses stay as they are.</p>
      <div className="action-row">
        <button type="button" className="btn" disabled={!canEdit || !!getState().matching} onClick={() => enable(false)}>Enable responsibility matching</button>
        <button type="button" className="btn btn-primary" disabled={!canEdit || controller.busy || !!controller.error} onClick={() => enable(true)}>Import this preview</button>
        {!!getState().matching && <Link className="btn" to="/matching">Open organization library</Link>}
      </div>
      {problem && <p role="alert">{problem}</p>}
    </section>
    <MatchingSetupView {...controller} document={controller.document} onExample={() => navigate("/matching?example=1")} />
  </>
}

function OrganizationMatchingPage({ canEdit }: { canEdit: boolean }) {
  const store = useStore(), navigate = useNavigate()
  const external = organizationSetupDocument(store.state)
  const initial = useMemo<MatchingSetupInitial>(() => ({ contextKey: external?.contextKey ?? "unreadable", references: external?.references ?? { organizationId: "unreadable", roles: [], members: [] }, memberships: [] }), [external?.id])
  const storage = useMemo<MatchingStorage>(() => ({
    getItem: () => { const doc = organizationSetupDocument(store.getState()); return doc ? JSON.stringify(doc) : null },
    setItem: (_key, raw) => {
      const document = parseSetupDocument(JSON.parse(raw))
      if (!store.tryDispatch({ type: "matchingSave", document, expectedRevision: document.revision - 1 })) throw new Error("The library changed or could not be saved. Keep this draft, export it and reopen the library.")
    },
  }), [store.getState, store.tryDispatch])
  const controller = useMatchingSetup(initial, store.state.viewerId, canEdit, storage, store.state.aiEnabled, external ?? undefined)
  const [backup, setBackup] = useState<DemoState | null>(null)
  const [error, setError] = useState("")
  return <>
    <section className="card form-stack" aria-label="Organization matching mode">
      <h2>{matchingModeEnabled(store.state) ? "Responsibility matching is enabled" : "Responsibility matching is paused"}</h2>
      <p>Pausing changes how future tasks are assigned. This library and existing assignment history are retained.</p>
      <div className="action-row">
        <button type="button" className="btn" disabled={!canEdit || (!external && !matchingModeEnabled(store.state))} onClick={() => store.tryDispatch({ type: "matchingMode", enabled: !matchingModeEnabled(store.state) })}>{matchingModeEnabled(store.state) ? "Pause responsibility matching" : "Use responsibility matching"}</button>
        <Link className="btn" to="/matching?draft=1">Review saved preview</Link>
        <button type="button" className="btn" onClick={store.exportData}>Export business backup</button>
      </div>
      <label>Restore business backup<input type="file" accept=".json" disabled={!canEdit} onChange={async event => {
        const file = event.target.files?.[0]; event.target.value = ""
        if (!file) return
        try {
          if (file.size > 15_000_000) throw new Error("Use a backup smaller than 15 MB.")
          const value = JSON.parse(await file.text()), state = value.state ?? value
          if (![22, 23].includes(state.schemaVersion) || !Array.isArray(state.people) || !Array.isArray(state.nodes) || !Array.isArray(state.roles) || !state.org) throw new Error("Choose a supported complete business backup, not an isolated setup preview.")
          setBackup(state); setError("")
        } catch (failure) { setError(failure instanceof Error ? failure.message : "This backup could not be read.") }
      }} /></label>
      {backup && <div className="form-stack"><p>Restore {backup.org.name}, including {backup.nodes.length} tasks and its responsibility records? Your current data will be backed up first.</p><button type="button" className="btn" onClick={() => { if (store.tryDispatch({ type: "replace", state: backup })) { setBackup(null); navigate("/matching") } else setError("The backup could not be restored safely. Export current data before trying again.") }}>Restore this backup</button></div>}
      {error && <p role="alert">{error}</p>}
    </section>
    {!external || !controller.document ? <section className="card"><h1>Responsibilities</h1><p role="alert">The saved matching configuration is unreadable or uses an unsupported version. Its original data is retained. Matching tasks will stay unassigned until it is recovered or you explicitly pause this mode.</p><button type="button" className="btn" onClick={store.exportData}>Download retained data</button></section>
      : <><MatchingSetupView {...controller} document={controller.document} live currentMemberIds={store.state.people.filter(isOfficer).map(p => p.id)} onExample={() => navigate("/matching?example=1")} />
        <div id="matching-preview"><WorkflowResponsibilityMap state={store.state} onCommand={command => store.tryDispatch({ type: "matchingCommand", command })} /></div></>}
  </>
}
