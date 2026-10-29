import { createContext, useContext, useState, type ReactNode } from "react"

/**
 * "Behind the scenes" (S7): a global switch that shows, next to the numbers, dates and AI output on a page, where each
 * came from. It is off by default and, when off, the notes are not in the page at all (not hidden, not zero-height),
 * so screen readers, word counts and the layout never see them. The choice is kept in localStorage.
 */
const KEY = "platypus.v1.bts"
interface BtsValue { on: boolean; setOn: (on: boolean) => void }
const BtsCtx = createContext<BtsValue>({ on: false, setOn: () => {} })

function initial(): boolean {
  try { return window.localStorage.getItem(KEY) === "1" } catch { return false /* storage unavailable */ }
}

export function BtsProvider({ children }: { children: ReactNode }) {
  const [on, setOnState] = useState(initial)
  const setOn = (v: boolean) => {
    setOnState(v)
    try { window.localStorage.setItem(KEY, v ? "1" : "0") } catch { /* storage unavailable */ }
  }
  return <BtsCtx.Provider value={{ on, setOn }}>{children}</BtsCtx.Provider>
}

export const useBts = () => useContext(BtsCtx)

/** One note. `rule` = worked out by the rule engine or plain arithmetic; `ai` = written by the AI model. */
export function Bts({ kind = "rule", label, children }: { kind?: "rule" | "ai"; label: string; children: ReactNode }) {
  const { on } = useBts()
  if (!on) return null
  return <span className={`bts k-${kind}`}><b>{label}</b> {children}</span>
}

/** A line of notes under a block. Renders nothing when the switch is off. */
export function BtsRow({ children }: { children: ReactNode }) {
  const { on } = useBts()
  return on ? <div className="bts-row">{children}</div> : null
}

/** The same, as a full-width table row. */
export function BtsTr({ cols, children }: { cols: number; children: ReactNode }) {
  const { on } = useBts()
  return on ? <tr className="bts-tr"><td colSpan={cols}><div className="bts-row">{children}</div></td></tr> : null
}
