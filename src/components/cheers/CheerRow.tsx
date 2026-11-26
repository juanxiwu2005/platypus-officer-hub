import type { ReactNode } from "react"
import type { Cheer, DemoState } from "../../data/types"
import { Avatar, Hover } from "../ui"
import { dayLabel, directionOf, fullName, otherIds, otherLabel, pointsLabel, taskLabel } from "./shared"

/**
 * One cheer as its sender or recipient sees it: who, the note, the date and the points (F1 card and F3 history).
 * `compact` (the Team card) shows the note on the row, clamped to two lines (Juanxi's option B, 2026-11-26; Team's visible
 * word limit is 160 in scripts/word-count.mjs), with the full note one hover or tap away; the history dialog shows every note in full. The row's trigger is logged as "cheer-row"
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
      // Team card (F1, Juanxi's option B): the note shows on the row, clamped to two lines; the hover or tap card keeps the full note.
      ? <div className="ch-fi-main">
        <div className="ch-fi-who"><span className={`ch-dir ${dir}`}>{dir === "in" ? "Received" : "Sent"}</span><Hover className="ch-hover" card={<span className="hc-line ch-hc-note">“{c.note}”</span>}><span className="ch-fi-trigger" tabIndex={0} data-testid="cheer-row-who" data-log-name="cheer-row">{who}</span></Hover></div>
        <p className="ch-fi-note">“{c.note}” · {when}</p>
      </div>
      : <div className="ch-fi-main">
        <div className="ch-fi-who"><span className={`ch-dir ${dir}`}>{dir === "in" ? "Received" : "Sent"}</span>{who}{task && <> · {task}</>}</div>
        <p className="ch-fi-note">“{c.note}” · {when}</p>
        {action}
      </div>}
    <span className={`ch-pts ${dir}`}>{pointsLabel(c, viewerId)}</span>
  </li>
}
