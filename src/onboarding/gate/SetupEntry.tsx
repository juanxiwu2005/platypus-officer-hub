import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { loadJson, saveJson } from "../../lib/localDocs"
import { useOnboardingDraft } from "../draft"
import { forgetWalkthrough } from "../record"
import { stopReading } from "../founder/constitution/useReading"
import { FOUNDER_START } from "../target"
import { fromLegacySetup, isLegacySetup, legacySetupPath, type LegacySetup } from "./legacySetup"

/** All non-study setup links enter the same founder flow; an old draft is offered once, never silently overwritten. */
export default function SetupEntry() {
  const navigate = useNavigate()
  const { draft, restore } = useOnboardingDraft()
  const [saved, setSaved] = useState<{ savedAt: string; value: LegacySetup } | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const active = useRef(true)
  useEffect(() => {
    forgetWalkthrough(); stopReading()
    active.current = true
    let on = true
    const timeout = setTimeout(() => { if (on) setError("Your saved setup is taking longer to open. Reload to retry, or open the guide.") }, 2000)
    void Promise.all([loadJson<unknown>("setup-draft"), loadJson<{ savedAt: string }>("setup-draft-imported")]).then(([old, imported]) => {
      if (!on) return
      clearTimeout(timeout)
      setError("")
      if (!old || imported?.value?.savedAt === old.savedAt) { navigate(FOUNDER_START, { replace: true }); return }
      if (isLegacySetup(old.value)) setSaved({ ...old, value: old.value })
      else setError("Your older setup is still kept in this browser. It could not be opened here.")
    })
    return () => { on = false; active.current = false; clearTimeout(timeout) }
  }, [navigate])
  const resume = async () => {
    if (!saved) return
    setBusy(true); setError("")
    const restored = await restore(fromLegacySetup(draft, saved.value))
    if (!active.current) return
    if (!restored) {
      setError("Your setup could not be saved. Your drafts are still kept. Please retry."); setBusy(false); return
    }
    await saveJson("setup-draft-imported", { savedAt: saved.savedAt })
    if (active.current) navigate(legacySetupPath(saved.value.step), { replace: true })
  }
  if (!saved && !error) return <p role="status">Opening setup…</p>
  return <section className="ob-card" aria-labelledby="setup-resume-title">
    <h1 id="setup-resume-title">Continue your setup</h1>
    {saved && <p>Your saved roles, duties and constitution can continue in this guide.</p>}
    {error && <p role="alert">{error}</p>}
    <div className="action-row">
      {saved && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void resume()}>{busy ? "Saving…" : "Continue saved setup"}</button>}
      <button type="button" className="btn" disabled={busy} onClick={() => navigate(FOUNDER_START, { replace: true })}>Open setup guide</button>
    </div>
  </section>
}
