import { useEffect, useRef, useState } from "react"
import type { MatchingStorage } from "./contracts"
import { extractMatchingResponsibilities } from "./constitutionClient"
import type { MatchingSetupDocument, MatchingSetupInitial, MatchingSetupViewProps } from "./setupContracts"
import {
  beginSetupRead, commandSetup, decideSetupProposal, finishSetupRead, loadSetupDocument,
  isSetupReadCurrent, prepareSetupSource, referenceSetup, saveSetupDocument, setupStorageKey, sourceSetup,
} from "./setupWorkspace"

const browserStorage: MatchingStorage = {
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
}

export function downloadSetup(raw: string, fileName = "responsibility-setup.json") {
  const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }))
  const anchor = document.createElement("a")
  anchor.href = url; anchor.download = fileName; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

type SetupController = Omit<MatchingSetupViewProps, "document" | "onExample"> & { document: MatchingSetupDocument | null; recoveryRaw: string | null }

export function useMatchingSetup(initial: MatchingSetupInitial, actorId: string, canEdit: boolean, storage: MatchingStorage = browserStorage, aiEnabled = true): SetupController {
  const [loaded] = useState(() => loadSetupDocument(storage, initial))
  const [document, setDocument] = useState(loaded.document)
  const [error, setError] = useState(loaded.error)
  const [busy, setBusy] = useState(false)
  const current = useRef(document), expected = useRef(loaded.storedRevision), authority = useRef(canEdit)
  const active = useRef<{ controller: AbortController; id: string } | null>(null)
  const unsaved = useRef<MatchingSetupDocument | null>(null)
  const mounted = useRef(false)
  const aiAuthority = useRef(aiEnabled)
  const actor = useRef(actorId)
  authority.current = canEdit
  aiAuthority.current = aiEnabled
  actor.current = actorId

  const persist = (next: MatchingSetupDocument, internal = false): boolean => {
    if (!internal && !authority.current) { setError("Only the current president or vice president can edit this setup preview."); return false }
    if (unsaved.current) { setError("An unsaved preview is being held. Export it and reload before making more changes."); return false }
    if (next === current.current) return true
    try {
      saveSetupDocument(storage, next, expected.current)
      expected.current = next.revision; current.current = next
      if (mounted.current) { setDocument(next); setError(null) }
      const inFlight = active.current
      if (inFlight && next.reads.find(r => r.id === inFlight.id)?.status !== "pending") {
        inFlight.controller.abort(); active.current = null
        if (mounted.current) setBusy(false)
      }
      return true
    } catch (failure) {
      unsaved.current = next
      if (mounted.current) setError(failure instanceof Error ? failure.message : "The preview could not be saved. Keep your draft and export before leaving.")
      return false
    }
  }
  const change = (fn: (doc: MatchingSetupDocument) => MatchingSetupDocument) => {
    if (!current.current) return
    try { persist(fn(current.current)) }
    catch (failure) { setError(failure instanceof Error ? failure.message : "This change could not be applied.") }
  }

  useEffect(() => {
    mounted.current = true
    const leaving = () => {
      const request = active.current
      if (!request || !current.current) return
      request.controller.abort(); active.current = null
      persist(finishSetupRead(current.current, request.id, actor.current, { status: "interrupted", message: "This reading was interrupted by leaving the page. Choose explicitly whether to retry." }), true)
    }
    const changed = (event: StorageEvent) => {
      if (event.key === setupStorageKey(initial.contextKey) && event.newValue !== JSON.stringify(current.current)) {
        setError("This preview changed in another tab. Export your draft and reload before continuing.")
        active.current?.controller.abort(); active.current = null; setBusy(false)
      }
    }
    window.addEventListener("storage", changed)
    window.addEventListener("beforeunload", leaving)
    window.addEventListener("pagehide", leaving)
    return () => {
      mounted.current = false
      active.current?.controller.abort(); active.current = null
      window.removeEventListener("storage", changed)
      window.removeEventListener("beforeunload", leaving)
      window.removeEventListener("pagehide", leaving)
    }
    // The containing page is keyed by the initial context. Callback state stays in refs.
  }, [])

  useEffect(() => {
    if (!canEdit || !current.current) return
    for (const read of current.current.reads.filter(r => r.status === "pending" && r.id !== active.current?.id)) {
      // Refresh or switching back to an editor never resends a paid request.
      persist(finishSetupRead(current.current, read.id, actorId, { status: "interrupted", message: "This reading was interrupted. Start a new reading only when you choose to retry." }), true)
    }
  }, [canEdit])

  const onRead: MatchingSetupViewProps["onRead"] = (source, targetRoleIds) => {
    if (!authority.current || !current.current || active.current) return
    if (!aiAuthority.current) { setError("AI is turned off. You can continue setting up responsibilities manually."); return }
    if (unsaved.current) { setError("Export the unsaved preview and reload before starting another reading."); return }
    let pending: MatchingSetupDocument
    try {
      const safeSource = prepareSetupSource(source)
      if (targetRoleIds === undefined && current.current.reads.some(read => read.status === "completed"
        && read.request.targetRoleIds === undefined && read.request.text === safeSource.text && isSetupReadCurrent(current.current!, read.id))) { setError(null); return }
      pending = beginSetupRead(current.current, safeSource, actorId, targetRoleIds)
    }
    catch (failure) { setError(failure instanceof Error ? failure.message : "This source could not be read."); return }
    // Saving the exact source and request is a prerequisite for a paid request.
    if (!persist(pending)) return
    const read = pending.reads.at(-1)!, controller = new AbortController()
    active.current = { controller, id: read.id }; setBusy(true)
    void extractMatchingResponsibilities(read.request, { signal: controller.signal }).then(response => {
      if (!mounted.current || controller.signal.aborted || !current.current || active.current?.id !== read.id) return
      persist(finishSetupRead(current.current, read.id, actorId, { response }), true)
    }).catch(failure => {
      if (!mounted.current || controller.signal.aborted || !current.current || active.current?.id !== read.id) return
      const message = failure instanceof Error ? failure.message : "AI could not read this text. You can continue manually."
      if (persist(finishSetupRead(current.current, read.id, actorId, { status: "failed", message }), true)) setError(message)
    }).finally(() => {
      if (active.current?.id === read.id) { active.current = null; if (mounted.current) setBusy(false) }
    })
  }

  return {
    document, canEdit, aiEnabled, busy, error, recoveryRaw: loaded.raw,
    onCommand: command => change(doc => commandSetup(doc, [command], actorId)),
    onReferencesChange: references => change(doc => referenceSetup(doc, references, actorId)),
    onSourceChange: source => change(doc => sourceSetup(doc, source, actorId)),
    onProposal: (readId, proposalId, decision) => change(doc => decideSetupProposal(doc, readId, proposalId, decision, actorId)),
    onRead,
    onStop: () => {
      const request = active.current
      if (!request || !current.current) return
      request.controller.abort(); active.current = null; setBusy(false)
      change(doc => finishSetupRead(doc, request.id, actorId, { status: "stopped", message: "Stopped waiting. The provider may still finish; no suggestions were adopted." }))
    },
    onExport: () => {
      const draft = unsaved.current ?? current.current
      const raw = draft ? JSON.stringify(draft, null, 2) : loaded.raw
      if (raw) downloadSetup(raw)
    },
  }
}
