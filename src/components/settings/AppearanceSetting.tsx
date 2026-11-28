import { useState } from "react"
import { APPEARANCES, APPEARANCE_LABELS, applyAppearance, readAppearance, saveAppearance, type Appearance } from "../../lib/appearance"

/**
 * Settings → My preferences → Appearance: Follow system (default), Always light, Always dark.
 * A choice applies at once and is kept in this browser only (docs/DESIGN_TOKENS.md section 14). Radios, like the other
 * one-of-several choices in Settings.
 */
export function AppearanceSetting() {
  const [value, setValue] = useState<Appearance>(() => readAppearance())
  const [kept, setKept] = useState(true)
  const choose = (next: Appearance) => { setValue(next); applyAppearance(next); setKept(saveAppearance(next)) }
  return <fieldset data-testid="settings-appearance"><legend className="small muted">Appearance</legend>
    {APPEARANCES.map(a => <label key={a} className="check-label"><input type="radio" name="appearance" value={a} checked={value === a} onChange={() => choose(a)} />{APPEARANCE_LABELS[a]}</label>)}
    {!kept && <p role="status" className="save-status err">This browser could not save it; it lasts until you reload.</p>}
  </fieldset>
}
