import { useOnboardingDraft } from "../draft"
// OB-04 replaces this placeholder.
export function Name() { const { draft, update } = useOnboardingDraft(); return <section className="ob-card"><h1>Your club</h1><label className="field">Club name<input value={draft.club.name} onChange={event => update(d => ({ ...d, club: { ...d.club, name: event.target.value } }))} /></label></section> }
