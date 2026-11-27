import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import type { ReminderDraft } from "./draft"

/**
 * The editable-email code (draft.ts and DraftEditor.tsx) is not part of the startup bundle: it loads when a person's email
 * is first opened (R-S0). A draft can only exist after that, so code that asks before the load simply finds none.
 */
export type DraftModule = typeof import("./draft")
let loaded: DraftModule | null = null
let loading: Promise<DraftModule> | null = null
/** Listeners waiting for the draft code to load (subscribeDraftStore). */
const waiting = new Set<() => void>()

/** The draft code if it has loaded, else null (Send all reads it at click time). */
export const loadedDraftModule = () => loaded
export function loadDraftModule(): Promise<DraftModule> {
  loading ??= import("./draft").then(module => { loaded = module; [...waiting].forEach(wake => wake()); return module })
  return loading
}

/** Subscribe to the drafts, also before the draft code has loaded (the first change is the load itself). */
export function subscribeDraftStore(listener: () => void): () => void {
  if (loaded) return loaded.subscribeDrafts(listener)
  let off: (() => void) | null = null
  const wake = () => { waiting.delete(wake); off = loaded!.subscribeDrafts(listener); listener() }
  waiting.add(wake)
  return () => { waiting.delete(wake); off?.() }
}

/**
 * Drafts belong to one club, one viewer and one sending mode (R-S0 review, 2026-11-27). The store calls this after every
 * action that changed the data: a demo reset, an imported file, first-time setup or "View as" clears every draft (typed
 * text and "draft opened in Gmail"); a new sending mode forgets every Gmail draft, so "I sent this" waits for Open in Gmail.
 */
type DraftScope = { viewerId: string; org?: { settings?: { reminderMode?: unknown } } }
export function draftsAfterAction(type: string, before: DraftScope, after: DraftScope): void {
  if (!loaded || before === after) return
  if (type === "reset" || type === "replace" || type === "completeSetup" || before.viewerId !== after.viewerId) loaded.clearDrafts()
  else if (before.org?.settings?.reminderMode !== after.org?.settings?.reminderMode) loaded.forgetGmail()
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

/** Why Send all is off (contract §4: disabled, and say why), kept current as drafts change; null when nothing stops it. */
export function useSendAllBlocker(groups: Parameters<DraftModule["sendAllBlocker"]>[0], day: string): string | null {
  const read = useCallback(() => loaded?.sendAllBlocker(groups, day) ?? null, [groups, day])
  return useSyncExternalStore(subscribeDraftStore, read, read)
}
