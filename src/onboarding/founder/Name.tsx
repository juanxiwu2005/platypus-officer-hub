import { useOnboardingDraft } from "../draft"
export function Name() { const { draft, patch } = useOnboardingDraft(); return <section className="ob-card"><h1>Your club</h1><label className="field">Club name<input value={draft.clubName} onChange={event => patch({ clubName: event.target.value })} /></label></section> }
