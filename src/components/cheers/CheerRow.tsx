import type { ReactNode } from "react"
import type { Cheer, DemoState } from "../../data/types"
import { Avatar, Hover } from "../ui"
import { dayLabel, directionOf, fullName, otherIds, otherLabel, pointsLabel, recipientsLabel, taskLabel } from "./shared"

const DIR_LABEL = { in: "Received", out: "Sent", cc: "Shared" } as const

/**
 * One cheer as someone in it sees it: who, the note, the date and the points (F1 card and F3 history). A cheer the viewer was
 * let know of (R1.1) reads "From Maya to Jordan" and shows its points without a sign: they are not the viewer's.
 * `compact` (the Team card) shows the note on the row, clamped to two lines (Juanxi's option B, 2026-11-26; Team's visible
 * word limit is 160 in scripts/word-count.mjs), with the full note one hover or tap away; the history dialog shows every note in full. The row's trigger is logged as "cheer-row"
 * (`data-log-name`), so the research log never records who is in a cheer.
 */
export function CheerRow({ s, c, viewerId, withTask, date, action, extra, compact }: { s: DemoState; c: Cheer; viewerId: string; withTask?: boolean; date?: string; action?: ReactNode; extra?: ReactNode; compact?: boolean }) {
  const dir = directionOf(c, viewerId)
  const task = withTask ? taskLabel(s, c.nodeId) : null
  const who = dir === "cc"
    ? <>From <b>{otherLabel(s, c, viewerId)}</b> to <b>{recipientsLabel(s, c)}</b></>
    : <>{dir === "in" ? "From" : "To"} <b>{otherLabel(s, c, viewerId)}</b></>
  const when = <span className="ch-d">{date ?? dayLabel(c.on, s.today)}</span>
  return <li className={`ch-fi${compact ? " compact" : ""}`} data-testid="cheer-row" data-cheer={c.id} data-dir={dir}>
    <Avatar name={fullName(s, otherIds(c, viewerId)[0])} size="sm" />
    {compact
      // Team card (F1, Juanxi's option B): the note shows on the row, clamped to two lines; the hover or tap card keeps the full note.
      ? <div className="ch-fi-main">
        <div className="ch-fi-who"><span className={`ch-dir ${dir}`}>{DIR_LABEL[dir]}</span><Hover className="ch-hover" card={<span className="hc-line ch-hc-note">“{c.note}”</span>}><span className="ch-fi-trigger" tabIndex={0} data-testid="cheer-row-who" data-log-name="cheer-row">{who}</span></Hover></div>
        <p className="ch-fi-note">“{c.note}” · {when}</p>
      </div>
      : <div className="ch-fi-main">
        <div className="ch-fi-who"><span className={`ch-dir ${dir}`}>{DIR_LABEL[dir]}</span>{who}{task && <> · {task}</>}</div>
        <p className="ch-fi-note">“{c.note}” · {when}{action && <> · {action}</>}</p>
        {extra}
      </div>}
    <span className={`ch-pts ${dir}`}>{pointsLabel(c, viewerId)}</span>
  </li>
}
