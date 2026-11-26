import type { ReactNode } from "react"
import type { Cheer, DemoState } from "../../data/types"
import { Avatar, Hover } from "../ui"
import { dayLabel, directionOf, fullName, otherIds, otherLabel, pointsLabel, taskLabel } from "./shared"

/**
 * One cheer as its sender or recipient sees it: who, the note, the date and the points (F1 card and F3 history).
 * `compact` (the Team card) keeps the note one hover or tap away, so Team stays within its word budget (≤ 130 visible
 * words, scripts/word-count.mjs); the history dialog shows every note in full. The row's trigger is logged as "cheer-row"
 * (`data-log-name`), so the research log never records who is in a cheer.
 */
export function CheerRow({ s, c, viewerId, withTask, date, action, compact }: { s: DemoState; c: Cheer; viewerId: string; withTask?: boolean; date?: string; action?: ReactNode; compact?: boolean }) {
  const dir = directionOf(c, viewerId)
  const task = withTask ? taskLabel(s, c.nodeId) : null
  const who = <>{dir === "in" ? "From" : "To"} <b>{otherLabel(s, c, viewerId)}</b></>
  const when = <span className="ch-d">{date ?? dayLabel(c.on, s.today)}</span>
  return <li className={`ch-fi${compact ? " compact" : ""}`} data-testid="cheer-row" data-cheer={c.id} data-dir={dir}>
    <Avatar name={fullName(s, otherIds(c, viewerId)[0])} size="sm" />
    {compact
      ? <div className="ch-fi-main"><Hover className="ch-hover" card={<span className="hc-line ch-hc-note">“{c.note}”</span>}><span className="ch-fi-who ch-fi-trigger" tabIndex={0} data-testid="cheer-row-who" data-log-name="cheer-row">{who}</span></Hover><span className="ch-fi-when small muted">{when}</span></div>
      : <div className="ch-fi-main">
        <div className="ch-fi-who"><span className={`ch-dir ${dir}`}>{dir === "in" ? "Received" : "Sent"}</span>{who}{task && <> · {task}</>}</div>
        <p className="ch-fi-note">“{c.note}” · {when}</p>
        {action}
      </div>}
    <span className={`ch-pts ${dir}`}>{pointsLabel(c, viewerId)}</span>
  </li>
}
