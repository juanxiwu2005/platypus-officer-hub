import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Info } from "../../components/ui"
import { useStore } from "../../data/store"
import { onboardingCopy } from "../copy"
import { useFlow } from "../engine/useFlow"
import { endWalkthrough, recordEvent } from "../record"
import { emailHref, inviteUrl, officerRows, whatsappHref } from "./invite/links"

const c = onboardingCopy.founder.invite

/**
 * Screen 7 of the founder flow: the invitation moment. Nothing is sent from here: Copy link uses the clipboard, and WhatsApp and Email are plain
 * links that open a written message in a new tab. The list is local: Joined means that officer finished setup in this browser (the demo has no server).
 * "See what your officers will see" continues the same walkthrough into the member preview; it does not end the attempt.
 */
export function Invite() {
  const { state } = useStore()
  const flow = useFlow()
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState<"idle" | "yes" | "failed">("idle")
  const link = inviteUrl(state.org.inviteCode, window.location.origin, window.location.pathname)
  const club = state.org.name
  const rows = officerRows(state.roles, state.people)
  if (!flow) return null

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied("yes") }
    catch { setCopied("failed"); input.current?.focus(); input.current?.select() }
  }
  const preview = () => { recordEvent(flow.current.id, "leave"); recordEvent("member.invitation", "enter"); navigate("/welcome/member/invitation") }
  const today = () => { recordEvent(flow.current.id, "complete"); endWalkthrough("completed"); navigate("/") }

  return <section className="ob-card ob-i9" aria-labelledby="ob-i9-h">
    <div>
      <h1 id="ob-i9-h">{c.title}</h1>
      <p className="ob-lead">{c.lead}</p>
    </div>
    <div className="ob-actions">
      <button type="button" className="btn" onClick={() => void copy()}>{copied === "yes" ? c.copied : c.copy}</button>
      <a className="btn" href={whatsappHref(club, link)} target="_blank" rel="noopener noreferrer">{c.whatsapp}</a>
      <a className="btn" href={emailHref(club, link)} target="_blank" rel="noopener noreferrer">{c.email}</a>
    </div>
    <input ref={input} className="ob-i9-link" readOnly value={link} aria-label={c.link} onFocus={e => e.currentTarget.select()} />
    <p role="status" className="ob-i9-note small muted">{copied === "failed" ? c.copyFailed : ""}</p>
    <p className="small muted">{c.permission} {c.notSent}</p>
    <ul className="ob-i9-list" aria-label={c.officers}>
      {rows.map(r => <li key={r.id} className="ob-i9-row" data-status={r.status}>
        <span className="ob-i9-who">{r.name ? <b>{r.name}</b> : null}<span className="muted">{r.status === "open" ? c.open : r.role}</span></span>
        {r.status !== "open" && <span className={`ob-i9-status is-${r.status}`} data-testid="officer-status">{r.status === "joined" ? c.joined : c.invited}</span>}
      </li>)}
    </ul>
    <p className="small muted"><Info label={c.joinedNote}>{c.joinedNote}</Info></p>
    <div className="ob-actions">
      <button type="button" className="btn btn-primary" onClick={preview}>{c.preview}</button>
      <button type="button" className="btn" onClick={today}>{c.today}</button>
    </div>
  </section>
}
