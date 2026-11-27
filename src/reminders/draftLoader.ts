import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import type { ReminderDraft } from "./draft"

/**
 * The editable-email code (draft.ts and DraftEditor.tsx) is not part of the startup bundle: it loads when a person's email
 * is first opened (R-S0). A draft can only exist after that, so code that asks before the load simply finds none.
 */
export type DraftModule = typeof import("./draft")
let loaded: DraftModule | null = null
let loading: Promise<DraftModule> | null = null

/** The draft code if it has loaded, else null (Send all reads it at click time). */
export const loadedDraftModule = () => loaded
export function loadDraftModule(): Promise<DraftModule> {
  loading ??= import("./draft").then(module => (loaded = module))
  return loading
}

const none = () => () => {}
/** Load the draft code when `want` is true, and read this person's draft (re-rendering when it changes). */
export function useRowDraft(want: boolean, groupId: string | null | undefined, recipientId: string, day: string): { drafts: DraftModule | null; draft: ReminderDraft | undefined } {
  const [, ready] = useState(0)
  useEffect(() => {
    if (!want || loaded) return
    let current = true
    void loadDraftModule().then(() => { if (current) ready(n => n + 1) })
    return () => { current = false }
  }, [want])
  const drafts = loaded
  const read = useCallback(() => drafts?.findDraft(groupId, recipientId, day), [drafts, groupId, recipientId, day])
  const draft = useSyncExternalStore(drafts ? drafts.subscribeDrafts : none, read, read)
  return { drafts, draft }
}
