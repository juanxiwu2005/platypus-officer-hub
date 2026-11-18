import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import type { Node } from "../data/types"
import { useStore } from "../data/store"
import { officers } from "../data/permissions"
import { taskDefinitionKey, validTaskLinks } from "./data"
import { taskLinks } from "./links"
import { buildReminderFacts } from "../reminders/facts"

export function TaskEditPanel({ node, due, onClose }: { node: Node; due: string | null; onClose: () => void }) {
  const { state, tryDispatch, getState } = useStore()
  const [title, setTitle] = useState(node.title), [instructions, setInstructions] = useState(node.instructions ?? buildReminderFacts(state, node.id)?.requirement ?? "")
  const [owner, setOwner] = useState(node.ownerId ?? ""), [date, setDate] = useState(due ?? "")
  const [links, setLinks] = useState(() => taskLinks(state, node).map((link, index) => ({ ...link, key: `existing-${index}` })))
  const [error, setError] = useState("")
  const base = useRef(taskDefinitionKey(node)), originalDate = useRef(due)
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null, previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    panel.current?.querySelector<HTMLInputElement>("input")?.focus()
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose() }
      if (event.key !== "Tab") return
      const elements = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]') ?? [])
      const first = elements[0], last = elements.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      event.stopPropagation()
    }
    document.addEventListener("keydown", key, true)
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", key, true); opener?.focus() }
  }, [onClose])
  function save() {
    const externalLinks = links.map(({ label, url }) => ({ label: label.trim(), url: url.trim() }))
    if (!title.trim()) { setError("Enter a task name."); return }
    if (!validTaskLinks(externalLinks)) { setError("Give each link a label and a complete http or https URL, without sign-in credentials."); return }
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) { setError("Choose a valid due date."); return }
    const patch = { title: title.trim(), instructions: instructions.trim(), ownerId: owner || null, externalLinks, ...(date !== originalDate.current ? { clubDeadlineOverride: date || null } : {}) }
    const accepted = tryDispatch({ type: "updateNode", id: node.id, patch, expectedTask: base.current })
    const saved = getState().nodes.find(n => n.id === node.id)
    if (!accepted || saved?.title !== patch.title || saved.instructions !== patch.instructions || saved.ownerId !== patch.ownerId || JSON.stringify(saved.externalLinks) !== JSON.stringify(externalLinks)) { setError("Your changes were not saved. Your inputs are kept here. Check for newer changes or restore browser saving, then try again."); return }
    onClose()
  }
  return createPortal(<div className="task-edit-backdrop"><div className="task-edit-panel" role="dialog" aria-modal="true" aria-labelledby="edit-task-heading" ref={panel} data-testid="task-edit">
    <header><h2 id="edit-task-heading">Edit task</h2><button type="button" className="btn btn-quiet" aria-label="Close task editor" onClick={onClose}>×</button></header>
    <form onSubmit={e => { e.preventDefault(); save() }}>
      <div className="task-edit-fields">
        <label>Task name<input value={title} maxLength={100} required onChange={e => setTitle(e.target.value)} /></label>
        <label>Task instructions<textarea aria-label="Task instructions" value={instructions} maxLength={1200} rows={4} onChange={e => setInstructions(e.target.value)} /></label>
        <div className="task-edit-pair"><label>Due<input type="date" value={date} data-testid="due-input" onChange={e => setDate(e.target.value)} /></label><label>Owner<select value={owner} data-testid="owner-select" onChange={e => setOwner(e.target.value)}><option value="">No owner</option>{officers(state).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}{owner && !officers(state).some(p => p.id === owner) && <option value={owner} disabled>{state.people.find(p => p.id === owner)?.name ?? "Former teammate"}</option>}</select></label></div>
        <fieldset className="task-link-editor"><legend>External links</legend>{links.map((link, index) => <div className="task-link-row" key={link.key}><label><span className="sr-only">Link {index + 1} label</span><input value={link.label} maxLength={100} placeholder="Label" onChange={e => setLinks(links.map(x => x.key === link.key ? { ...x, label: e.target.value } : x))} /></label><label><span className="sr-only">Link {index + 1} URL</span><input type="url" value={link.url} maxLength={2048} placeholder="https://…" onChange={e => setLinks(links.map(x => x.key === link.key ? { ...x, url: e.target.value } : x))} /></label><button type="button" className="btn btn-quiet small" aria-label={`Remove link ${index + 1}`} onClick={() => setLinks(links.filter(x => x.key !== link.key))}>×</button></div>)}<button type="button" className="btn small" disabled={links.length >= 8} onClick={() => setLinks([...links, { key: crypto.randomUUID(), label: "", url: "" }])}>+ Add link</button></fieldset>
        {error && <p role="alert" className="small late-text">{error}</p>}
      </div>
      <footer><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary">Save changes</button></footer>
    </form>
  </div></div>, document.body)
}
