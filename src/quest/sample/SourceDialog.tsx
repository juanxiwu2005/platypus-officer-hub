import { useEffect, useMemo, useRef, useState } from "react"
import { QUEST_RULES } from "../ruleLibrary"
import { SETUP_SOURCE, checkVenue, initialVenue } from "./venue"
import { policySourceById } from "../../data/policyCatalog"
import type { QuestClock } from "../../engine/questSchedule"
import { fmtShort } from "../../lib/dates"
import "../../styles/quest-sources.css"

export interface SourceDialogProps { ids: readonly string[]; clock: QuestClock; onClose: () => void }
interface RawSource { record: string; line: number; quote: string; section: string | null }

/** One displayable quotation group: an ellipsis set on one line, or a space-joined split label across two lines. */
export interface QuoteGroup { record: string; start: number; end: number; quotes: readonly string[]; joined: boolean; section: string | null }
export interface SourceTopic { id: string; label: string; venue: boolean; timed: "registry" | "room" | "ritm" | null; groups: readonly QuoteGroup[] }

const TIMED: Record<string, "registry" | "room" | "ritm"> = { "2.1": "registry", "2.4": "room", "2.5": "ritm" }
const TIMED_LABEL: Record<"registry" | "room" | "ritm", string> = { registry: "Event Registry", room: "Room request", ritm: "RITM number" }
const oddQuotes = (text: string) => (text.match(/"/g)?.length ?? 0) % 2 === 1

/** Groups exact stored quotes without changing any fragment. */
export function groupQuotes(sources: readonly RawSource[]): QuoteGroup[] {
  const groups: QuoteGroup[] = []
  let i = 0
  while (i < sources.length) {
    const first = sources[i], quotes = [first.quote]
    let end = first.line, joined = false
    while (i + 1 < sources.length && sources[i + 1].record === first.record && sources[i + 1].line === first.line) quotes.push(sources[++i].quote)
    if (quotes.length === 1 && oddQuotes(first.quote) && i + 1 < sources.length && sources[i + 1].record === first.record && sources[i + 1].line === first.line + 1) { quotes.push(sources[++i].quote); end = sources[i].line; joined = true }
    groups.push({ record: first.record, start: first.line, end, quotes, joined, section: first.section })
    i++
  }
  return groups
}

/** Maps fixed scored-rule and venue IDs to topics; invalid IDs invent nothing. */
export function buildTopics(ids: readonly string[]): SourceTopic[] {
  const checks = checkVenue(initialVenue())
  const topics: SourceTopic[] = []
  for (const id of ids) {
    if (id === "venue.setup") continue
    if (id.startsWith("venue.")) {
      const check = checks.find(item => item.id === id.slice("venue.".length))
      if (check) topics.push({ id, label: `Venue: ${check.label}`, venue: true, timed: null, groups: groupQuotes(check.sources) })
    } else {
      const rule = QUEST_RULES.find(item => item.id === id)
      if (rule) topics.push({ id: rule.id, label: `Rule ${rule.id}: ${rule.summary}`, venue: false, timed: TIMED[rule.id] ?? null, groups: groupQuotes(rule.sources) })
    }
  }
  if (topics.some(topic => topic.venue)) topics.push({ id: "venue.setup", label: "Venue: Setup context", venue: true, timed: null, groups: groupQuotes([SETUP_SOURCE]) })
  return topics
}

const citeLines = (group: QuoteGroup) => group.start === group.end ? `line ${group.start}` : `lines ${group.start}–${group.end}`

export default function SourceDialog({ ids, clock, onClose }: SourceDialogProps) {
  const topics = useMemo(() => buildTopics(ids), [ids])
  const [ruleIndex, setRuleIndex] = useState(0)
  const [sourceIndex, setSourceIndex] = useState(0)
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => { if (dialog?.open) dialog.close() }
  }, [])
  const topic = topics[Math.min(ruleIndex, topics.length - 1)]
  const group = topic?.groups[Math.min(sourceIndex, topic.groups.length - 1)]
  const url = group ? policySourceById(group.record)?.sourceUrl ?? null : null
  return (
    <dialog ref={dialogRef} className="sample-source-dialog" aria-labelledby="sample-source-title" onClose={onClose}>
      <h2 id="sample-source-title" className="sample-source-title">Behind the moment</h2>
      {topic && group ? (
        <div className="sample-source-body">
          <label className="sample-source-field">Rule
            <select value={Math.min(ruleIndex, topics.length - 1)} onChange={event => { setRuleIndex(Number(event.target.value)); setSourceIndex(0) }}>
              {topics.map((item, index) => <option key={item.id} value={index}>{item.label}</option>)}
            </select>
          </label>
          <label className="sample-source-field">Source
            <select value={Math.min(sourceIndex, topic.groups.length - 1)} onChange={event => setSourceIndex(Number(event.target.value))}>
              {topic.groups.map((item, index) => <option key={index} value={index}>{`${item.record} · ${citeLines(item)}`}</option>)}
            </select>
          </label>
          <blockquote className="sample-source-quote">
            {group.joined ? <p>{group.quotes.join(" ")}</p> : group.quotes.map((quote, index) => (
              <p key={index}>{index > 0 && <span className="sample-source-gap" aria-hidden="true">… </span>}{quote}</p>
            ))}
          </blockquote>
          <p className="sample-source-cite">
            {`${group.record} · ${citeLines(group)}${group.section ? ` · ${group.section}` : ""}`}
            {url && <> · <a href={url} target="_blank" rel="noreferrer">Open in Handbook</a></>}
          </p>
          {topic.timed && <p className="sample-source-note">{`${TIMED_LABEL[topic.timed]}: ${fmtShort(clock.deadlines[topic.timed].date)} — ${clock.deadlines[topic.timed].explanation} Closed days move earlier.`}</p>}
          {topic.venue && <p className="sample-source-note">Practice proposal. Venue staff confirm the reserved setup.</p>}
        </div>
      ) : <p className="sample-source-note">No source text for this moment.</p>}
      <button type="button" className="sample-source-back" onClick={() => dialogRef.current?.close()}>Back</button>
    </dialog>
  )
}
