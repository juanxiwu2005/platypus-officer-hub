import { createContext, useContext } from "react"

export type SettingsTab = "club" | "roles" | "workflow" | "links" | "me" | "admin"
export const SETTINGS_TABS: readonly SettingsTab[] = ["club", "roles", "workflow", "links", "me", "admin"]
export const isSettingsTab = (value: unknown): value is SettingsTab => typeof value === "string" && (SETTINGS_TABS as readonly string[]).includes(value)

/** Settings provides this so a section can open another one (Roles & teams ↔ Workflow). */
export const SettingsNavContext = createContext<((tab: SettingsTab) => void) | null>(null)

/** Opens another Settings section. Outside Settings it falls back to the deep link `#/settings?tab=…`. */
export function useSettingsNav(): (tab: SettingsTab) => void {
  const go = useContext(SettingsNavContext)
  return go ?? (tab => { window.location.hash = `#/settings?tab=${tab}` })
}
