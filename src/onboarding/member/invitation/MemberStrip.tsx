import { useEffect, useRef } from "react"
import { onboardingCopy } from "../../copy"
import { DemoStrip } from "../../shell/DemoStrip"
import type { Preview } from "./usePreview"

const c = onboardingCopy.member.invitation

/** The amber Demo strip for the member preview: who is being previewed, and a small picker to change it. Nothing here verifies an identity. */
export function MemberStrip({ preview }: { preview: Preview }) {
  const { state, person, picking, setPicking, choose } = preview
  const select = useRef<HTMLSelectElement>(null)
  const change = useRef<HTMLButtonElement>(null)
  const wasPicking = useRef(false)
  useEffect(() => {
    if (picking) select.current?.focus()
    else if (wasPicking.current) change.current?.focus()
    wasPicking.current = picking
  }, [picking])
  if (!person) return null
  return <div className="ob-m-strip" data-testid="member-strip">
    <DemoStrip>
      {c.previewing} <b>{person.name}</b>{" "}
      {picking
        ? <select ref={select} className="ob-m-pick" aria-label={c.changeLabel} value={person.id} onChange={e => choose(e.target.value)} onBlur={() => setPicking(false)} onKeyDown={e => { if (e.key === "Escape") setPicking(false) }}>
          {state.people.map(p => <option key={p.id} value={p.id}>{p.name} · {state.roles.find(r => r.id === p.roleId)?.displayName}</option>)}
        </select>
        : <button ref={change} type="button" className="ob-m-link" onClick={() => setPicking(true)}>{c.change}</button>}
    </DemoStrip>
  </div>
}
