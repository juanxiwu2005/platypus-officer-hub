import { useEffect, useId, useState, type FormEvent } from "react"
import type { MatchingMember, MatchingQualificationStatus, MatchingRole, Responsibility } from "../contracts"
import { getMatchingCandidates } from "../resolve"
import type { MatchingSetupViewProps } from "../setupContracts"
import { candidateExplanation, setupId } from "./viewHelpers"

export function TeamAssignments(props: MatchingSetupViewProps) {
  const { document: workspace, canEdit } = props
  const duties = workspace.matching.responsibilities.filter(row => row.status !== "archived")
  const [selectedId, setSelectedId] = useState("")
  const duty = duties.find(row => row.id === selectedId) ?? duties[0]
  const [newRole, setNewRole] = useState("")
  const [newRoleId, setNewRoleId] = useState(setupId)
  const id = useId()
  useEffect(() => {
    if (workspace.references.roles.some(role => role.id === newRoleId)) { setNewRole(""); setNewRoleId(setupId()) }
  }, [workspace.references.roles, newRoleId])
  const addRole = (event: FormEvent) => {
    event.preventDefault()
    props.onReferencesChange({ ...workspace.references, roles: [...workspace.references.roles, { id: newRoleId, title: newRole.trim() }] })
  }
  return <section id="matching-team" className="card matching-section" aria-labelledby={`${id}-heading`}>
    <header><div><h2 id={`${id}-heading`}>3. Connect people & defaults</h2><p>Positions share responsibilities. Member exceptions and required qualifications refine who can take the work.</p></div></header>
    <div className="matching-role-list">
      {workspace.references.roles.map(role => <RoleSetup key={role.id} {...props} role={role} duties={duties} />)}
      {!props.live && <form className="matching-inline-form" onSubmit={addRole}><label htmlFor={`${id}-new-role`}>New position in this preview</label><input id={`${id}-new-role`} value={newRole} maxLength={180} disabled={!canEdit} onChange={event => setNewRole(event.target.value)} /><button type="submit" className="btn" disabled={!canEdit || !newRole.trim()}>Add position</button></form>}
      {props.live && <p className="matching-muted">Manage positions and member names in Team settings. These responsibility links do not grant a management role.</p>}
    </div>
    {!duty ? <p className="matching-muted">Create a responsibility first to connect members and choose a default person.</p> : <>
      <label className="matching-select-label" htmlFor={`${id}-duty`}>Manage people for</label><select id={`${id}-duty`} value={duty.id} onChange={event => setSelectedId(event.target.value)}>{duties.map(row => <option key={row.id} value={row.id}>{row.title}{row.status === "draft" ? " · draft" : ""}</option>)}</select>
      {duty.status !== "confirmed" && <p className="matching-warning">Confirm this responsibility in the library before setting an effective default person.</p>}
      <div className="matching-member-list">{workspace.references.members.map(member => <MemberSetup key={`${duty.id}-${member.id}`} {...props} duty={duty} member={member} />)}</div>
      <DefaultRule key={duty.id} {...props} duty={duty} />
    </>}
  </section>
}

function RoleSetup(props: MatchingSetupViewProps & { role: MatchingRole; duties: Responsibility[] }) {
  const { role, document: workspace, canEdit, onCommand } = props
  const [title, setTitle] = useState(role.title)
  const id = useId()
  useEffect(() => setTitle(role.title), [role.title])
  return <details className="matching-details matching-role">
    <summary>{role.title}<span className="matching-muted"> · {workspace.matching.roleResponsibilities.filter(row => row.roleId === role.id && row.confirmed).length} responsibilities</span></summary>
    {!props.live && <form className="matching-inline-form" onSubmit={event => { event.preventDefault(); props.onReferencesChange({ ...workspace.references, roles: workspace.references.roles.map(row => row.id === role.id ? { ...row, title: title.trim() } : row) }) }}>
      <label htmlFor={`${id}-name`}>Position name</label><input id={`${id}-name`} value={title} maxLength={180} disabled={!canEdit} onChange={event => setTitle(event.target.value)} /><button type="submit" className="btn" disabled={!canEdit || !title.trim() || title.trim() === role.title}>Save position name</button>
    </form>}
    <fieldset className="matching-choice-group"><legend>Responsibilities for {role.title}</legend><div className="matching-bubbles">
      {props.duties.map(duty => {
        const binding = workspace.matching.roleResponsibilities.find(row => row.roleId === role.id && row.responsibilityId === duty.id)
        return <label key={duty.id} className={`matching-bubble matching-check${binding?.confirmed ? " is-selected" : ""}`}><input type="checkbox" checked={binding?.confirmed ?? false} disabled={!canEdit} onChange={event => onCommand({ type: "roleBinding.upsert", value: { id: binding?.id ?? setupId(), roleId: role.id, responsibilityId: duty.id, confirmed: event.target.checked } })} />{duty.title}{binding && !binding.confirmed && <span>Not confirmed</span>}</label>
      })}
      {!props.duties.length && <p className="matching-muted">Add responsibilities to the library first.</p>}
    </div></fieldset>
    <fieldset className="matching-choice-group"><legend>Members in {role.title}</legend><div className="matching-check-list">
      {workspace.references.members.map(member => {
        const membership = workspace.matching.memberships.find(row => row.roleId === role.id && row.memberId === member.id)
        return <label key={member.id}><input type="checkbox" checked={membership?.confirmed ?? false} disabled={!canEdit} onChange={event => onCommand({ type: "membership.upsert", value: { id: membership?.id ?? setupId(), roleId: role.id, memberId: member.id, confirmed: event.target.checked } })} />{member.name}{!member.active && " · not current"}</label>
      })}
    </div></fieldset>
  </details>
}

function MemberSetup(props: MatchingSetupViewProps & { member: MatchingMember; duty: Responsibility }) {
  const { document: workspace, member, duty, canEdit } = props
  const id = useId()
  const binding = workspace.matching.memberResponsibilities.find(row => row.memberId === member.id && row.responsibilityId === duty.id)
  const candidate = getMatchingCandidates(workspace.matching, workspace.references, duty.id).find(row => row.memberId === member.id)
  const roles = workspace.matching.memberships.filter(row => row.confirmed && row.memberId === member.id).map(row => workspace.references.roles.find(role => role.id === row.roleId)?.title).filter(Boolean)
  const updateMember = (patch: Partial<MatchingMember>) => props.onReferencesChange({ ...workspace.references, members: workspace.references.members.map(row => row.id === member.id ? { ...row, ...patch } : row) })
  return <details className="matching-details matching-member">
    <summary><strong>{member.name}</strong><span className="matching-muted"> · {candidate ? candidateExplanation(candidate) : duty.status === "confirmed" ? "not linked" : "responsibility not confirmed"}</span></summary>
    <p className="matching-muted">{roles.length ? roles.join(" · ") : "No confirmed position membership"}</p>
    <div className="matching-fields-grid">
      <label htmlFor={`${id}-override`}>Direct responsibility exception<select id={`${id}-override`} value={binding?.confirmed ? binding.decision : "inherit"} disabled={!canEdit} onChange={event => props.onCommand({ type: "memberBinding.upsert", value: { id: binding?.id ?? setupId(), memberId: member.id, responsibilityId: duty.id, decision: event.target.value === "exclude" ? "exclude" : "include", confirmed: event.target.value !== "inherit" } })}><option value="inherit">Use position links only</option><option value="include">Include directly</option><option value="exclude">Exclude from this responsibility</option></select></label>
      <label htmlFor={`${id}-available`}>Availability<select id={`${id}-available`} value={member.availability} disabled={!canEdit} onChange={event => updateMember({ availability: event.target.value as MatchingMember["availability"] })}><option value="unknown">Unknown</option><option value="available">Available</option><option value="unavailable">Unavailable</option></select></label>
      {duty.requiredQualificationIds.map(qualification => <label key={qualification} htmlFor={`${id}-qualification-${qualification}`}>{qualification}<select id={`${id}-qualification-${qualification}`} value={member.qualifications[qualification] ?? "unknown"} disabled={!canEdit} onChange={event => updateMember({ qualifications: { ...member.qualifications, [qualification]: event.target.value as MatchingQualificationStatus } })}><option value="unknown">Unknown</option><option value="confirmed">Confirmed by a person</option><option value="missing">Not met</option></select></label>)}
      <label className="matching-check"><input type="checkbox" checked={member.active} disabled={!canEdit || (!!props.live && !props.currentMemberIds?.includes(member.id))} onChange={event => updateMember({ active: event.target.checked })} />Current member</label>
    </div>
    {!!duty.requiredQualificationIds.length && <p className="matching-muted">Confirm qualifications manually. Platypus has not verified access to an external system.</p>}
  </details>
}

function DefaultRule(props: MatchingSetupViewProps & { duty: Responsibility }) {
  const { document: workspace, duty, canEdit } = props
  const policy = workspace.matching.policies.find(row => row.responsibilityId === duty.id)
  const [primary, setPrimary] = useState(policy?.primaryMemberId ?? "")
  const [backup, setBackup] = useState(policy?.backupMemberId ?? "")
  const id = useId()
  const candidates = getMatchingCandidates(workspace.matching, workspace.references, duty.id)
  useEffect(() => { setPrimary(policy?.primaryMemberId ?? ""); setBackup(policy?.backupMemberId ?? "") }, [policy?.revision, policy?.primaryMemberId, policy?.backupMemberId])
  const eligible = (memberId: string) => !memberId || candidates.some(row => row.memberId === memberId && row.eligibility === "eligible")
  const valid = eligible(primary) && eligible(backup) && (!backup || (!!primary && primary !== backup))
  const dirty = primary !== (policy?.primaryMemberId ?? "") || backup !== (policy?.backupMemberId ?? "")
  const options = (other: string) => workspace.references.members.map(member => {
    const candidate = candidates.find(row => row.memberId === member.id)
    return <option key={member.id} value={member.id} disabled={!candidate || candidate.eligibility !== "eligible" || member.id === other}>{member.name}{candidate ? candidate.eligibility === "eligible" ? "" : ` · ${candidateExplanation(candidate)}` : " · not a qualified candidate"}</option>
  })
  return <form className="matching-policy" onSubmit={event => { event.preventDefault(); props.onCommand({ type: "policy.upsert", value: { id: policy?.id ?? setupId(), responsibilityId: duty.id, primaryMemberId: primary || null, backupMemberId: backup || null } }) }}>
    <h3>Default person & backup</h3><p className="matching-muted">The default person is preselected for new work. A backup is suggested when needed and still requires confirmation.</p>
    <div className="matching-fields-grid"><label htmlFor={`${id}-primary`}>Default person<select id={`${id}-primary`} value={primary} disabled={!canEdit || duty.status !== "confirmed"} onChange={event => setPrimary(event.target.value)}><option value="">No default</option>{options(backup)}</select></label><label htmlFor={`${id}-backup`}>Backup<select id={`${id}-backup`} value={backup} disabled={!canEdit || duty.status !== "confirmed"} onChange={event => setBackup(event.target.value)}><option value="">No backup</option>{options(primary)}</select></label></div>
    {!valid && <p role="status" className="matching-warning">Review this rule: both people must be different, qualified, available candidates, and a backup needs a default person.</p>}
    <button type="submit" className="btn" disabled={!canEdit || duty.status !== "confirmed" || !valid || (!dirty && !!policy)}>Save default rule</button>
  </form>
}
