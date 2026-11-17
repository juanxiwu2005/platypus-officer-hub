import { lazy, useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useStore } from "../data/store"
import { TaskDetail } from "../components/TaskDetail"
import { usableGrant, verifyOfficerGrant } from "../lib/officerLinks"

const SingleTaskPage = lazy(() => import("../reminders/SingleTaskPage"))

export default function Officer() {
  const [params] = useSearchParams()
  return params.has("access") ? <SingleTaskPage token={params.get("access") ?? ""} /> : <LegacyOfficer />
}

function LegacyOfficer() {
  const { state } = useStore()
  const [params] = useSearchParams()
  const token = params.get("token") ?? ""
  const [verified, setVerified] = useState(false)
  const grant = usableGrant(state, token)
  useEffect(() => {
    let active = true
    setVerified(false)
    verifyOfficerGrant(state, token).then(ok => { if (active) setVerified(ok) }).catch(() => { if (active) setVerified(false) })
    return () => { active = false }
  }, [token, state.demoLinkKey, grant?.id, grant?.usedOn, state.today])
  const stored = state.officerGrants.find(g => `${g.id}.${g.signature}` === token)
  const node = state.nodes.find(n => n.id === grant?.nodeId)
  return <main className="officer-page"><header><Link to="/">Platypus</Link><span className="tag accent">Your task</span></header>
    <p className="small muted">Local demo · no account needed · this link works in the browser where it was created.</p>
    {stored?.usedOn ? <section className="card"><h1>Update saved</h1><p role="status">This link has been used. Your update is recorded, and this round of follow-up has stopped.</p><p className="small muted">Ask the president for a fresh link for your next update.</p></section> : verified && node && grant ? <><h1>Hi {state.people.find(p => p.id === grant.ownerId)?.name.split(" ")[0]}</h1><TaskDetail key={grant.id} node={node} actorId={grant.ownerId} token={token} initialReply={params.get("reply")} /><p className="small muted">Opening this page does not change your task. Choose an action to confirm your update.</p></> : <section className="card"><h1>Check your task link</h1><p role="status">{grant ? "Checking your link…" : "This link is expired, changed, or unavailable in this browser. Ask the president for a fresh link."}</p></section>}
  </main>
}
