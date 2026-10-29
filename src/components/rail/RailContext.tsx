import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

/**
 * The right rail (v1.1, decision 1): one column on the right of every page with two tabs.
 * "Ask" is the only AI entry point; "Details" shows whatever was clicked.
 */
export type Detail =
  | { kind: "node"; id: string }
  | { kind: "task"; id: string; reply?: string | null }
  | { kind: "nudge"; id: string }
  | { kind: "funding"; eventId: string }
  | { kind: "partner"; id: string }
  | { kind: "handoff"; roleId: string }
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
  /** Put a question into the Ask box (and send it if `send`). */
  ask: (text: string, send?: boolean) => void
  pending: { text: string; send: boolean; n: number } | null
  takePending: () => void
  /** A new event waiting for its plan check (M2b). Kept here so it survives the Ask panel closing on a phone. */
  reviewEventId: string | null
  requestReview: (eventId: string) => void
  takeReview: () => void
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
    if (!detailOpen.current) {
      const a = document.activeElement
      returnFocus.current = a instanceof HTMLElement && a !== document.body && !a.closest(".rail") ? a : null
    }
    detailOpen.current = true
    setDetail(d)
    setTab("details")
    if (!openRef.current) openedForDetail.current = true
    setOpenState(true)
  }, [])
  const closeDetail = useCallback(() => {
    detailOpen.current = false
    const back = returnFocus.current
    returnFocus.current = null
    if (back) setTimeout(() => { if (back.isConnected) back.focus() }, 0)
    setDetail(null)
    setTab("ask")
    if (openedForDetail.current) setOpenState(false)
    openedForDetail.current = false
  }, [])
  const ask = useCallback((text: string, send = false) => {
    setPending(p => ({ text, send, n: (p?.n ?? 0) + 1 }))
    setTab("ask")
    setOpenState(true)
  }, [])
  const takePending = useCallback(() => setPending(null), [])
  const [reviewEventId, setReviewEventId] = useState<string | null>(null)
  const requestReview = useCallback((eventId: string) => { setReviewEventId(eventId); setTab("ask"); setOpenState(true) }, [])
  const takeReview = useCallback(() => setReviewEventId(null), [])

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

  const value = useMemo(() => ({ open, setOpen, tab, setTab, detail, show, closeDetail, ask, pending, takePending, reviewEventId, requestReview, takeReview }), [open, setOpen, tab, detail, show, closeDetail, ask, pending, takePending, reviewEventId, requestReview, takeReview])
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
