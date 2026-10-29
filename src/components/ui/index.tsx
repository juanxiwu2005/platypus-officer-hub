import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react"
import { useStore } from "../../data/store"
import type { DemoState, Node, NodeStatus } from "../../data/types"
import type { ForecastResult } from "../../engine/forecast"

/**
 * The five building blocks of the v1.1 interface (AGENTS.md §7):
 * StatusPill, Chain, the .tbl table class, Hover / Info, and the right-rail details (rail/RailContext).
 * Look → hover → click. Words live in hover cards, not on the page.
 */

import { PALETTE, STATUS_DEFAULTS, STATUS_ORDER } from "./statusDefaults"
export { PALETTE, STATUS_DEFAULTS, STATUS_ORDER }

export type StatusStyles = Record<NodeStatus, { label: string; color: string }>
export function statusStyles(state: DemoState): StatusStyles {
  const b = state.org.board
  return Object.fromEntries(STATUS_ORDER.map(s => [s, {
    label: b?.labels?.[s]?.trim() || STATUS_DEFAULTS[s].label,
    color: b?.colors?.[s] || STATUS_DEFAULTS[s].color,
  }])) as StatusStyles
}
export function useStatusStyles() {
  const { state } = useStore()
  return statusStyles(state)
}

/** Solid coloured status label, the same everywhere (monday-style). */
export function StatusPill({ status, small }: { status: NodeStatus; small?: boolean }) {
  const s = useStatusStyles()[status]
  return <span className={`pill${small ? " sm" : ""}`} style={{ "--pill": s.color } as CSSProperties} data-status={status}>{s.label}</span>
}
export function NodePill({ node, small }: { node: Node; small?: boolean }) {
  return <StatusPill status={node.status} small={small} />
}

/** True on a screen that cannot hover (phones, tablets). Hover cards become tap-to-open there (AGENTS.md §7.3, S8). */
export function useTouch(): boolean {
  const query = "(hover: none)"
  const [touch, setTouch] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(query).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const on = () => setTouch(mq.matches)
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])
  return touch
}

const FOCUSABLE = "button, a[href], input, select, textarea, [tabindex]"
/**
 * A light card that appears when you rest on (or focus) the child. At most three short lines.
 * On a screen that cannot hover, tapping the child opens the same card as a sheet at the bottom of the screen;
 * tapping anywhere else, or Escape, closes it. The text is the same text, so there is no second set of explanations.
 */
export function Hover({ children, card, className = "", block }: { children: ReactNode; card: ReactNode; className?: string; block?: boolean }) {
  const Tag = block ? "div" : "span"
  const touch = useTouch()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = box.current
    if (!touch || !el) return
    const trigger = el.querySelector<HTMLElement>(FOCUSABLE)
    const target = trigger ?? el
    if (!trigger) el.tabIndex = 0
    // aria-expanded is only allowed on real controls, so a plain focusable span or the box itself is given the button role.
    if (!/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(target.tagName) && !target.getAttribute("role")) target.setAttribute("role", "button")
    target.setAttribute("aria-expanded", String(open))
  })
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Element | null)) setOpen(false) }
    const esc = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("pointerdown", away); window.addEventListener("keydown", esc)
    return () => { document.removeEventListener("pointerdown", away); window.removeEventListener("keydown", esc) }
  }, [open])
  const touchProps = touch ? {
    "data-open": open,
    onClick: (e: MouseEvent) => { e.stopPropagation(); setOpen(o => !o) }, // a tap on the trigger is for the card, not for the row or card around it
    onKeyDown: (e: KeyboardEvent) => { if ((e.key === "Enter" || e.key === " ") && e.target === box.current) { e.preventDefault(); setOpen(o => !o) } },
  } : {}
  return <Tag ref={box as never} className={`hover ${className}`} {...touchProps}>{children}<span className="hover-card" role="tooltip">{card}</span></Tag>
}

/** An ⓘ icon whose explanation shows on hover or focus. */
export function Info({ children, label = "More information" }: { children: ReactNode; label?: string }) {
  return <Hover className="info-wrap" card={children}><button type="button" className="info" aria-label={label}><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M8 7v4.2M8 4.6v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></button></Hover>
}

export type StopState = "done" | "now" | "todo" | "risk"
export interface Stop { key: string; label?: string; state: StopState; hint?: ReactNode; onClick?: () => void; testId?: string }

/** Parcel-tracking style chain: filled = done, large = now, hollow = later, red ring = at risk. */
export function Chain({ stops, label, showLabels = true, compact }: { stops: Stop[]; label: string; showLabels?: boolean; compact?: boolean }) {
  const lastDone = stops.reduce((i, s, k) => (s.state === "done" ? k : i), -1)
  return <ol className={`chain${compact ? " compact" : ""}${showLabels ? "" : " no-labels"}`} aria-label={label}>
    {stops.map((s, i) => {
      const dot = <span className={`dot ${s.state}`} aria-hidden="true" />
      const text = s.label && showLabels ? <span className="chain-label">{s.label}</span> : null
      const name = `${s.label ?? `Step ${i + 1}`}: ${s.state === "done" ? "done" : s.state === "now" ? "current" : s.state === "risk" ? "at risk" : "not started"}`
      const body = s.onClick
        ? <button type="button" className="chain-btn" onClick={s.onClick} aria-label={name} data-testid={s.testId}>{dot}{text}</button>
        : s.hint
          ? <button type="button" className="chain-btn" aria-label={name} data-testid={s.testId}>{dot}{text}</button>
          : <span className="chain-btn" aria-label={name} role="img" data-testid={s.testId}>{dot}{text}</span>
      return <li key={s.key} className={`${i <= lastDone ? "past" : ""} ${s.state}`}>
        {s.hint ? <Hover card={s.hint}>{body}</Hover> : body}
      </li>
    })}
  </ol>
}

export function Avatar({ name, size = "md", title }: { name: string | null | undefined; size?: "sm" | "md"; title?: string }) {
  const text = name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?"
  return <span className={`avatar ${size === "sm" ? "sm" : ""}${name ? "" : " empty"}`} title={title ?? name ?? "No owner"} aria-label={title ?? name ?? "No owner"}>{text}</span>
}

/** Progress ring for goals and handbook progress. */
export function Ring({ value, max, size = 44, label, color }: { value: number; max: number; size?: number; label: string; color?: string }) {
  const r = size / 2 - 4, c = 2 * Math.PI * r, p = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  return <svg className="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="5" />
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color ?? "var(--accent)"} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
  </svg>
}

const RISK_WORD = { red: "At risk", yellow: "Watch", green: "On track" } as const
/** Forecast colour as a dot; reasons and the percentage sit in the hover card. */
export function RiskDot({ result, withWord }: { result: ForecastResult; withWord?: boolean }) {
  return <span className="forecast" data-testid="forecast">
    <Hover card={<>{result.reasons.map(r => <span key={r} className="hc-line">{r}</span>)}<span className="hc-line muted">{Math.round(result.probability * 100)}% of {result.runs.toLocaleString()} simulated runs finish on time.</span></>}>
      <button type="button" className={`risk ${result.color}`} aria-label={`${RISK_WORD[result.color]}: ${result.reasons.join(" ")}`}><i />{withWord && <span>{RISK_WORD[result.color]}</span>}</button>
    </Hover>
  </span>
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>
}

export const firstNameOf = (name: string | null | undefined) => name ? name.split(" ")[0] : "No owner"
