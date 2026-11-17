import type { MatchingSetupViewProps } from "../setupContracts"
import { SourcePanel } from "./SourcePanel"
import { ResponsibilityLibrary } from "./ResponsibilityLibrary"
import { TeamAssignments } from "./TeamAssignments"
import { WorkflowPreview } from "./WorkflowPreview"

export default function MatchingSetupView(props: MatchingSetupViewProps) {
  const confirmed = props.document.matching.responsibilities.filter(row => row.status === "confirmed").length
  return <div className="matching-setup" data-testid="matching-setup">
    <header className="matching-heading">
      <div><p className="matching-eyebrow">{props.live ? "Organization library" : "Setup preview"}</p><h1>Responsibilities</h1>
        <p>Define the work, connect your team, then preview who can take it.</p></div>
      <div className="matching-actions">
        <button type="button" className="btn" disabled={!props.canEdit || props.busy} onClick={props.onExample}>Try 12-person example</button>
        <button type="button" className="btn" onClick={props.onExport}>Export preview</button>
      </div>
    </header>
    <p className="matching-notice">{props.live ? "This library is used for new tasks when responsibility matching is enabled. Existing owners stay assigned until someone explicitly changes them." : "Changes here stay in this setup preview. Existing tasks and team records are unchanged."}</p>
    {!props.canEdit && <p className="matching-notice">You can review this setup. Switch to the president or vice president to edit.</p>}
    {props.error && <p className="matching-error" role="alert">{props.error}</p>}
    <nav className="matching-jump" aria-label="Responsibility setup sections">
      <a href="#matching-source" onClick={event => { event.preventDefault(); document.getElementById("matching-source")?.scrollIntoView({ block: "start" }) }}>1. Source</a>
      <a href="#matching-library" onClick={event => { event.preventDefault(); document.getElementById("matching-library")?.scrollIntoView({ block: "start" }) }}>2. Responsibilities ({confirmed} confirmed)</a>
      <a href="#matching-team" onClick={event => { event.preventDefault(); document.getElementById("matching-team")?.scrollIntoView({ block: "start" }) }}>3. People & defaults</a>
      <a href="#matching-preview" onClick={event => { event.preventDefault(); document.getElementById("matching-preview")?.scrollIntoView({ block: "start" }) }}>{props.live ? "4. Workflow links" : "4. Assignment preview"}</a>
    </nav>
    <SourcePanel {...props} />
    <ResponsibilityLibrary {...props} />
    <TeamAssignments {...props} />
    {!props.live && <WorkflowPreview {...props} />}
  </div>
}
