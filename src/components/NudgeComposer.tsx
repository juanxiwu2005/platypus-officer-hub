import { Feedback } from "./Feedback"
import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useStore } from "../data/store"
import type { Channel, OfficerGrant } from "../data/types"
import { makeOfficerGrant, officerUrl, usableGrant, grantToken } from "../lib/officerLinks"
import { aiWaitMs, callApi, readAiBudget, wasStopped } from "../lib/api"
import { AiWait } from "./AiWait"
import { buildNudge, composeUrl, messageText, nudgeBlocked, STATUS_ACTIONS } from "../lib/nudges"
import { emitUi } from "../lib/uiLog"
import { onboardingCopy } from "../onboarding/copy"

const CHANNEL_LABEL = { whatsapp: "WhatsApp", sms: "Text message", email: "Gmail" }
export function NudgeComposer({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const { state, dispatch } = useStore()
  const canNudge = state.people.some(person => person.id === state.viewerId)
  const node = state.nodes.find(n => n.id === nodeId)
  const person = state.people.find(p => p.id === node?.ownerId)
  const [channel, setChannel] = useState<Channel>(person?.channels[0] ?? "whatsapp")
  const [meaning, setMeaning] = useState<unknown>()
  const [busy, setBusy] = useState(false)
  const [source, setSource] = useState("Checked template")
  const [openedText, setOpenedText] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [grant, setGrant] = useState<OfficerGrant | null>(null)
  const [linkError, setLinkError] = useState("")
  const heading = useRef<HTMLHeadingElement>(null)
  // FB-1: the AI line's request, so "Skip AI line" can end it at once and fall back to the checked template.
  const aiRequest = useRef<AbortController | null>(null)
  useEffect(() => { heading.current?.focus() }, [])
  useEffect(() => { void readAiBudget() }, [])
  // Research log: the composer opened for this task (its channel choice and the draft link are pressed controls, logged by the page listener).
  useEffect(() => { emitUi("ui.reminder", { action: "open", nodeId, channel }) }, [nodeId])
  useEffect(() => {
    let current = true
    setGrant(null); setLinkError("")
    if (!canNudge || !node?.ownerId || node.status === "done") return
    makeOfficerGrant(state, node.id).then(g => { if (current) { dispatch({ type: "issueOfficerGrant", grant: g }); setGrant(g) } }).catch(() => { if (current) setLinkError("Could not prepare a task link. Close and reopen this draft.") })
    return () => { current = false }
  }, [nodeId, node?.ownerId, node?.ownerVersion, node?.status, state.today, state.demoLinkKey, canNudge])
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", esc)
    return () => window.removeEventListener("keydown", esc)
  }, [onClose])
  useEffect(() => {
    let current = true
    setBusy(false); setMeaning(undefined)
    if (!state.aiEnabled || !canNudge || !node || nudgeBlocked(state, node)) return
    setBusy(true)
    const ctrl = new AbortController()
    aiRequest.current = ctrl
    const downstream = state.nodes.find(n => n.dependsOn.includes(node.id) && n.status !== "done")
    callApi<{ whyItMatters?: unknown; source: string }>("/nudge/draft", { node: { id: node.id, title: node.title, tier: node.tier, estDays: node.estDays, lastUpdate: node.lastUpdate, latestStart: node.latestStart, clubDeadline: node.clubDeadline, officialDeadline: node.officialDeadline }, downstream: downstream ? { title: downstream.title, latestStart: downstream.latestStart } : null, today: state.today, remindAt: person?.remindAt, mission: state.org.mission }, aiWaitMs(), ctrl.signal)
      .then(result => { if (current && !ctrl.signal.aborted) { setMeaning(result.whyItMatters); setSource("AI + checked template") } })
      .catch(e => { if (current && !wasStopped(e)) setSource("Checked template · AI unavailable") })
      .finally(() => { if (current && aiRequest.current === ctrl) { aiRequest.current = null; setBusy(false) } })
    return () => { current = false; ctrl.abort() }
    // Rebuild on task changes, so an old response cannot overwrite a newer task.
  }, [node, state.aiEnabled, canNudge, state.today, person?.remindAt, state.org.mission])
  if (!node || !person) return null
  /** Skip AI line: stop waiting now and use the checked template; the draft button is ready at once (the line can no longer arrive). */
  const skipAi = () => {
    aiRequest.current?.abort()
    aiRequest.current = null
    setMeaning(undefined); setSource("Checked template · AI line skipped"); setBusy(false)
    heading.current?.focus()
  }
  const blocked = !canNudge ? "Choose a current officer before preparing a reminder." : nudgeBlocked(state, node)
  const draft = buildNudge(state, node, state.aiEnabled ? meaning : undefined)
  const message = messageText(draft, window.location.origin, node.id, grant ?? undefined)
  const url = composeUrl(channel, message, draft.subject)
  const ready = !blocked && draft.checked && !busy && !confirmed && !!grant && !!usableGrant(state, grantToken(grant))
  return <aside className="panel nudge-panel" role="dialog" aria-labelledby="nudge-heading" data-testid="nudge-panel">
    <div className="panel-head"><span className="eyebrow">Private reminder · review first</span><button className="btn btn-quiet" aria-label="Close reminder" onClick={onClose}>✕</button></div>
    <h2 id="nudge-heading" tabIndex={-1} ref={heading}>{person.name}</h2>
    <p className="small muted">{state.aiEnabled ? source : "Checked template · AI off"} · {draft.wordCount}/100 words · {draft.checked ? "Wording checked" : "Needs review"}</p>
    <label className="composer-channel">Preferred channel<select value={channel} onChange={e => { setChannel(e.target.value as Channel); setOpenedText(null) }}>{[...new Set([...person.channels, "whatsapp", "sms", "email"] as Channel[])].map(c => <option key={c} value={c}>{CHANNEL_LABEL[c]}{c === person.channels[0] ? " · preferred" : ""}</option>)}</select></label>
    <p className="small muted">Preferred time: {person.remindAt === "evening" ? "evening, around 7 pm" : "morning, around 9 am"}. Keep messages between 8 am and 10 pm.</p>
    {/* P3-H: the walkthrough's Reminders answer, read-only. It changes nothing here: this composer only opens a draft that a person sends. */}
    {state.org.settings.reminderMode && <p className="small muted" data-testid="reminder-mode-note">Your club chose: {onboardingCopy.founder.reminders.options[state.org.settings.reminderMode].title} (demo: nothing is sent).</p>}
    <b>{draft.subject}</b>
    <div className="nudge-body" data-testid="nudge-body">{draft.body}</div><Feedback id={`nudge:${nodeId}:${draft.body}`} text={draft.body}/>
    <div className="status-actions" aria-label="Recipient status choices">{STATUS_ACTIONS.map(a => grant ? <Link className="btn small" key={a.key} to={officerUrl("", grant, a.key).slice(2)} onClick={onClose}>{a.label}</Link> : <button className="btn small" key={a.key} disabled>{a.label}</button>)}</div>
    <p className="small muted">One-use task links. Local demo: use the browser where the draft was created.</p>
    {linkError && <p className="small late-text" role="alert">{linkError}</p>}
    <details><summary className="small">Sources & task details</summary><p className="small">Latest task update: {node.lastUpdate ?? "not recorded"}. Dates and waiting steps come from the rule engine. {node.ruleIds.join(", ") || node.source}.</p><Link to={`/tasks?node=${encodeURIComponent(node.id)}`} onClick={onClose}>Open this task</Link></details>
    {blocked && <p className="small warn-text" role="status">{blocked}</p>}
    {busy && !confirmed && <AiWait onStop={skipAi} stopLabel="Skip AI line" stopTestId="nudge-skip-ai" />}
    {confirmed ? <p className="small good-text" role="status">Recorded as sent by you. The app cannot verify delivery.</p> : <>
      {ready ? <a className="btn btn-primary" href={url} target={channel === "sms" ? undefined : "_blank"} rel="noreferrer" onClick={() => setOpenedText(message)}>Open {CHANNEL_LABEL[channel]} draft</a> : <button className="btn" disabled>{busy ? "Checking draft…" : "Draft unavailable"}</button>}
      <p className="small muted">Demo: recipient is blank. Select a test destination yourself. Opening a draft does not record it as sent.</p>
      {openedText === message && ready && <button className="btn" onClick={() => { dispatch({ type: "confirmNudgeSent", nodeId: node.id, channel, text: message }); setConfirmed(true) }}>I sent this reminder</button>}
    </>}
  </aside>
}
