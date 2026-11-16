import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { emitUi } from "../../lib/uiLog"

/**
 * The right rail (v1.1, decision 1): one column on the right of every page with two tabs.
 * "Ask" is the only AI entry point; "Details" shows whatever was clicked.
 */
export type Detail =
  | { kind: "node"; id: string }
  | { kind: "task"; id: string; reply?: string | null }
  | { kind: "nudge"; id: string }
  | { kind: "funding"; eventId: string }
  | { kind: "event"; eventId: string }
  | { kind: "partner"; id: string }
  | { kind: "org"; id: string }
  | { kind: "handoff"; roleId: string }
  | { kind: "workflow" }
  | { kind: "board" }

export type RailTab = "ask" | "details"

interface RailValue {
  open: boolean
  setOpen: (open: boolean) => void
  tab: RailTab
  setTab: (tab: RailTab) => void
  detail: Detail | null
  /** Open something in Details. */
  show: (d: Detail) => void
  /** Close Details and go back to Ask. */
  closeDetail: () => void
  /** Settings supplies its selected workflow-step editor to the shared Details tab. */
  setWorkflowDetail: (content: ReactNode | null) => void
  workflowDetail: ReactNode | null
  /** Put a question into the Ask box (and send it if `send`). */
  ask: (text: string, send?: boolean) => void
  pending: { text: string; send: boolean; n: number } | null
  takePending: () => void
  /** A new event waiting for its plan check (M2b). Kept here so it survives the Ask panel closing on a phone. */
  reviewEventId: string | null
  requestReview: (eventId: string) => void
  takeReview: () => void
  /** "+ New event" (FB-5): show the empty event form in Ask at once, without AI. Ask takes the request when it is mounted. */
  newEvent: () => void
  formRequest: { kind: "event"; n: number } | null
  takeFormRequest: () => void
}

const RailCtx = createContext<RailValue | null>(null)
const OPEN_KEY = "platypus.v1.railOpen"
const wide = () => typeof window !== "undefined" && window.matchMedia?.("(min-width: 1200px)").matches

function initialOpen(): boolean {
  if (!wide()) return false
  try {
    const v = window.localStorage.getItem(OPEN_KEY)
    if (v === "0") return false
  } catch { /* storage unavailable */ }
  return true
}

export function RailProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(initialOpen)
  const [tab, setTab] = useState<RailTab>("ask")
  const [detail, setDetail] = useState<Detail | null>(null)
  const [workflowDetail, setWorkflowDetailState] = useState<ReactNode | null>(null)
  const openedForDetail = useRef(false)
  const openRef = useRef(open)
  openRef.current = open
  // What had focus when Details opened, so closing Details can give focus back (keyboard users).
  const returnFocus = useRef<HTMLElement | null>(null)
  const detailOpen = useRef(false)
  const [pending, setPending] = useState<RailValue["pending"]>(null)

  const setOpen = useCallback((v: boolean) => {
    setOpenState(v)
    if (wide()) try { window.localStorage.setItem(OPEN_KEY, v ? "1" : "0") } catch { /* storage unavailable */ }
  }, [])
  const show = useCallback((d: Detail) => {
    const a = document.activeElement
    // A new page trigger replaces the previous one; nested editors inside the rail keep that page trigger.
    if (a instanceof HTMLElement && a !== document.body && !a.closest(".rail")) returnFocus.current = a
    else if (!detailOpen.current) returnFocus.current = null
    detailOpen.current = true
    // Research log: what was opened (kind and id of fictional data), not its content.
    emitUi("ui.details", { action: "open", kind: d.kind, id: "id" in d ? d.id : "eventId" in d ? d.eventId : "roleId" in d ? d.roleId : null })
    setDetail(d)
    setTab("details")
    if (!openRef.current) openedForDetail.current = true
    setOpenState(true)
  }, [])
  const closeDetail = useCallback(() => {
    if (detailOpen.current) emitUi("ui.details", { action: "close" })
    detailOpen.current = false
    const back = returnFocus.current
    returnFocus.current = null
    if (back) setTimeout(() => { if (back.isConnected) back.focus() }, 0)
    setDetail(null)
    setWorkflowDetailState(null)
    setTab("ask")
    if (openedForDetail.current) setOpenState(false)
    openedForDetail.current = false
  }, [])
  const setWorkflowDetail = useCallback((content: ReactNode | null) => {
    setWorkflowDetailState(content)
    if (content) show({ kind: "workflow" })
  }, [show])
  const ask = useCallback((text: string, send = false) => {
    setPending(p => ({ text, send, n: (p?.n ?? 0) + 1 }))
    setTab("ask")
    setOpenState(true)
  }, [])
  const takePending = useCallback(() => setPending(null), [])
  const [reviewEventId, setReviewEventId] = useState<string | null>(null)
  const requestReview = useCallback((eventId: string) => { setReviewEventId(eventId); setTab("ask"); setOpenState(true) }, [])
  const takeReview = useCallback(() => setReviewEventId(null), [])
  const [formRequest, setFormRequest] = useState<RailValue["formRequest"]>(null)
  const newEvent = useCallback(() => {
    setFormRequest(r => ({ kind: "event", n: (r?.n ?? 0) + 1 }))
    setTab("ask")
    setOpenState(true)
  }, [])
  const takeFormRequest = useCallback(() => setFormRequest(null), [])

  // "/" focuses the Ask box from anywhere (unless typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) return
      e.preventDefault()
      setTab("ask"); setOpenState(true)
      setTimeout(() => document.getElementById("ask-input")?.focus(), 30)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const value = useMemo(() => ({ open, setOpen, tab, setTab, detail, show, closeDetail, setWorkflowDetail, workflowDetail, ask, pending, takePending, reviewEventId, requestReview, takeReview, newEvent, formRequest, takeFormRequest }), [open, setOpen, tab, detail, show, closeDetail, setWorkflowDetail, workflowDetail, ask, pending, takePending, reviewEventId, requestReview, takeReview, newEvent, formRequest, takeFormRequest])
  return <RailCtx.Provider value={value}>{children}</RailCtx.Provider>
}

export function useRail(): RailValue {
  const v = useContext(RailCtx)
  if (!v) throw new Error("useRail must be used inside <RailProvider>")
  return v
}

/** For components that may render outside the main layout (officer page, tests). */
export function useOptionalRail(): RailValue | null {
  return useContext(RailCtx)
}
