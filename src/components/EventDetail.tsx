import { useEffect, useState } from "react"
import { useStore } from "../data/store"
import { Empty } from "./ui"

/** The reusable source text for external forms and browser assistants. */
export function EventDetail({ eventId }: { eventId: string }) {
  const { state, dispatch } = useStore()
  const event = state.events.find(item => item.id === eventId)
  const [details, setDetails] = useState(event?.details ?? "")
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  useEffect(() => { setDetails(event?.details ?? ""); setSaved(false); setCopied(false) }, [event?.id, event?.details])
  if (!event) return <Empty>This event no longer exists.</Empty>
  const save = () => {
    const next = details.trim()
    if (next !== (event.details ?? "")) dispatch({ type: "updateEvent", id: event.id, patch: { details: next } })
    setSaved(true)
  }
  // Moved here from the task details (FB-4): the text belongs to the event, and forms for any of its steps reuse it.
  const copy = async () => { try { await navigator.clipboard.writeText(event.details ?? ""); setCopied(true) } catch { setCopied(false) } }
  return <section className="event-detail" aria-label="Event details">
    <h2>{event.name}</h2>
    <p className="small muted">Shared event information for forms, collaborators and browser assistants.</p>
    <label className="field"><span>Event Details</span><textarea rows={16} maxLength={5000} value={details} placeholder="Describe the event, agenda, audience, venue needs, partners, supplies, accessibility needs, and anything a form or assistant should know." onChange={e => { setDetails(e.target.value); setSaved(false) }} onBlur={save} /></label>
    <div className="action-row"><button type="button" className="btn btn-primary" onClick={save}>Save details</button>{saved && <span className="small good-text">Saved</span>}</div>
    <div className="event-copy"><button type="button" className="btn" disabled={!event.details?.trim()} onClick={copy}>{copied ? "Event details copied" : "Copy All Event Details"}</button>{!event.details?.trim() && <span className="small muted">Save Event Details first.</span>}</div>
  </section>
}
