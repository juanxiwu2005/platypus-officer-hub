import { useEffect, useId, useState, type FormEvent } from "react"
import type { Responsibility, ResponsibilityFields } from "../contracts"
import type { MatchingSetupViewProps } from "../setupContracts"
import { lines, qualificationIds, setupId } from "./viewHelpers"

function fieldsOf(duty?: Responsibility) {
  return { title: duty?.title ?? "", description: duty?.description ?? "", deliverable: duty?.deliverable ?? "", exclusions: duty?.exclusions.join("\n") ?? "", qualifications: duty?.requiredQualificationIds.join(", ") ?? "" }
}

export function ResponsibilityLibrary(props: MatchingSetupViewProps) {
  const [selectedId, setSelectedId] = useState(() => props.document.matching.responsibilities.find(row => row.status !== "archived")?.id ?? setupId())
  const duty = props.document.matching.responsibilities.find(row => row.id === selectedId)
  const active = props.document.matching.responsibilities.filter(row => row.status !== "archived")
  const archived = props.document.matching.responsibilities.filter(row => row.status === "archived")
  return <section id="matching-library" className="card matching-section" aria-labelledby="matching-library-heading">
    <header><div><h2 id="matching-library-heading">2. Build your responsibility library</h2><p>A responsibility describes work, not a fixed job title.</p></div><button type="button" className="btn" disabled={!props.canEdit} onClick={() => setSelectedId(setupId())}>New responsibility</button></header>
    <div className="matching-bubbles" aria-label="Responsibility library">
      {active.map(row => <button key={row.id} type="button" className={`matching-bubble${selectedId === row.id ? " is-selected" : ""}`} aria-pressed={selectedId === row.id} onClick={() => setSelectedId(row.id)}>{row.title}{" "}<span>{row.status === "confirmed" ? "Confirmed" : "Draft"}</span></button>)}
      {!active.length && <p className="matching-muted">No responsibilities yet. Add one manually or adopt an AI draft.</p>}
    </div>
    <ResponsibilityEditor key={selectedId} {...props} duty={duty} responsibilityId={selectedId} />
    {archived.length > 0 && <details className="matching-details"><summary>Archived responsibilities ({archived.length})</summary><ul>{archived.map(row => <li key={row.id}>{row.title}{row.mergedIntoId ? ` → ${props.document.matching.responsibilities.find(target => target.id === row.mergedIntoId)?.title ?? row.mergedIntoId}` : " · archived"}</li>)}</ul><p className="matching-muted">Historical links and assignment records are retained.</p></details>}
  </section>
}

function ResponsibilityEditor(props: MatchingSetupViewProps & { duty?: Responsibility; responsibilityId: string }) {
  const { duty, responsibilityId, onCommand, document: workspace } = props
  const [fields, setFields] = useState(() => fieldsOf(duty))
  const [mergeTarget, setMergeTarget] = useState("")
  const id = useId()
  useEffect(() => setFields(fieldsOf(duty)), [duty?.id, duty?.revision])
  const editable = props.canEdit && duty?.status !== "archived"
  const dirty = JSON.stringify(fields) !== JSON.stringify(fieldsOf(duty))
  const save = (event: FormEvent) => {
    event.preventDefault()
    const value: ResponsibilityFields = {
      title: fields.title.trim(), description: fields.description.trim(), deliverable: fields.deliverable.trim(),
      exclusions: lines(fields.exclusions), requiredQualificationIds: qualificationIds(fields.qualifications),
      origin: duty?.origin ?? "manual", sources: duty?.sources ?? [{ kind: "manual", sourceId: responsibilityId, note: "Created manually in responsibility setup." }],
    }
    onCommand(duty ? { type: "responsibility.update", id: responsibilityId, patch: value } : { type: "responsibility.create", value: { id: responsibilityId, ...value } })
  }
  const references = workspace.matching.requirements.filter(row => row.responsibilityId === responsibilityId).length
  return <div className="matching-editor">
    <h3>{duty ? duty.title : "New responsibility"}</h3>
    {duty && <p className="matching-muted">{duty.status === "confirmed" ? "Confirmed" : duty.status === "archived" ? "Archived" : "Draft"} · Used by {references} workflow {references === 1 ? "step" : "steps"}</p>}
    <form className="matching-form" onSubmit={save}>
      <label htmlFor={`${id}-title`}>Responsibility name</label><input id={`${id}-title`} value={fields.title} maxLength={180} required disabled={!editable} onChange={event => setFields({ ...fields, title: event.target.value })} />
      <label htmlFor={`${id}-description`}>What does this responsibility cover?</label><textarea id={`${id}-description`} value={fields.description} maxLength={2000} rows={3} disabled={!editable} onChange={event => setFields({ ...fields, description: event.target.value })} />
      <label htmlFor={`${id}-deliverable`}>What should be delivered?</label><input id={`${id}-deliverable`} value={fields.deliverable} maxLength={2000} disabled={!editable} onChange={event => setFields({ ...fields, deliverable: event.target.value })} />
      <label htmlFor={`${id}-exclusions`}>What does it exclude? <span className="matching-muted">One item per line</span></label><textarea id={`${id}-exclusions`} value={fields.exclusions} maxLength={10_000} rows={2} disabled={!editable} onChange={event => setFields({ ...fields, exclusions: event.target.value })} />
      <label htmlFor={`${id}-qualifications`}>Required qualifications <span className="matching-muted">Optional, separated by commas</span></label><input id={`${id}-qualifications`} value={fields.qualifications} maxLength={2000} disabled={!editable} placeholder="e.g. room-system-access" onChange={event => setFields({ ...fields, qualifications: event.target.value })} />
      <div className="matching-actions"><button type="submit" className="btn btn-primary" disabled={!editable || !fields.title.trim() || (!!duty && !dirty)}>Save draft</button>
        {duty && duty.status !== "archived" && <button type="button" className="btn" disabled={!editable || dirty || duty.status === "confirmed" || !duty.description.trim() || !duty.deliverable.trim()} onClick={() => onCommand({ type: "responsibility.confirm", id: duty.id })}>{duty.status === "confirmed" ? "Confirmed" : "Confirm responsibility"}</button>}
      </div>
      {duty && dirty && <p className="matching-muted">Save edits before confirming. Editing a confirmed responsibility makes it a draft again.</p>}
    </form>
    {duty?.sources.length ? <div className="matching-sources"><h4>Sources</h4>{duty.sources.map((source, index) => <div key={`${source.sourceId}-${index}`}><p className="matching-muted">{source.kind === "constitution" ? "Constitution source" : source.kind === "suggestion" ? "Suggestion · not a verified constitution duty" : source.kind === "manual" ? "Manually recorded" : source.kind === "workflow" ? "Workflow source" : "Policy source"}</p>{source.quote && <blockquote>{source.quote}</blockquote>}{source.note && <p className="matching-muted">{source.note}</p>}</div>)}</div> : null}
    {duty && duty.status !== "archived" && <details className="matching-details"><summary>Merge or archive</summary>
      <p>Merging moves links to the selected responsibility and requires a new review. Conflicting defaults or member exceptions must be resolved first.</p>
      <div className="matching-inline-form"><label htmlFor={`${id}-merge`}>Merge into</label><select id={`${id}-merge`} value={mergeTarget} disabled={!props.canEdit} onChange={event => setMergeTarget(event.target.value)}><option value="">Choose a responsibility</option>{workspace.matching.responsibilities.filter(row => row.id !== duty.id && row.status !== "archived").map(row => <option key={row.id} value={row.id}>{row.title}</option>)}</select><button type="button" className="btn" disabled={!props.canEdit || !mergeTarget} onClick={() => onCommand({ type: "responsibility.merge", sourceId: duty.id, targetId: mergeTarget })}>Merge responsibilities</button></div>
      <button type="button" className="btn" disabled={!props.canEdit} onClick={() => onCommand({ type: "responsibility.archive", id: duty.id })}>Archive responsibility</button>
    </details>}
  </div>
}
