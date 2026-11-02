import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

/** A dedicated, short-lived walkthrough draft. It intentionally does not replace the existing demo state. */
export interface OnboardingDraft { step: string; clubName: string; inviteCode: string }
interface DraftValue { draft: OnboardingDraft; patch: (next: Partial<OnboardingDraft>) => void }
const DraftContext = createContext<DraftValue | null>(null)
export function OnboardingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>({ step: "name", clubName: "", inviteCode: "" })
  const value = useMemo(() => ({ draft, patch: (next: Partial<OnboardingDraft>) => setDraft(previous => ({ ...previous, ...next })) }), [draft])
  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>
}
export function useOnboardingDraft() { const value = useContext(DraftContext); if (!value) throw new Error("OnboardingDraftProvider is required"); return value }
