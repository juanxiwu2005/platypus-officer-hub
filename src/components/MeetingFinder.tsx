import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import { useStore } from "../data/store"
import { profilePatch } from "../data/settings"
import { Info } from "./ui"
import { GRID_FROM, GRID_ROWS, GRID_STEP, GRID_TO, availabilityGrid, calendarDraftUrl, cellKey, cellsToSlots, commonMeetingSlots, hhmm, slotsToCells, whoIsFree } from "../engine/team"
import { addDays, fmtShort, fromISO } from "../lib/dates"

const clock = (m: number) => `${((Math.floor(m / 60) + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")} ${m < 720 ? "am" : "pm"}`
const hourTag = (m: number) => m % 120 === 0 ? `${((Math.floor(m / 60) + 11) % 12) + 1}${m < 720 ? "a" : "p"}` : ""
const dayName = (date: string) => fromISO(date).toLocaleDateString("en-US", { weekday: "short" })
const names = (list: { name: string }[]) => list.length ? list.map(p => p.name.split(" ")[0]).join(", ") : "nobody"

interface CellInfo { a: number; on?: boolean; all?: boolean; ring?: boolean; label: string }

/** One week of half-hour cells. Used twice: the personal grid (left) and the group grid (right). */
function SlotGrid({ label, testId, dates, marked, cell, onDown, onEnter, onActivate, onHover }: {
  label: string; testId: string; dates: string[]; marked: string
  cell: (d: number, k: number) => CellInfo
  onDown?: (d: number, k: number) => void; onEnter?: (d: number, k: number) => void
  onActivate: (d: number, k: number) => void; onHover?: (d: number, k: number) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const [cur, setCur] = useState<[number, number]>([0, 0])
  // Arrow keys move between cells; only one cell is a tab stop so keyboard users do not tab through 196 buttons.
  const keys = (e: KeyboardEvent, d: number, k: number) => {
    const move = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key]
    if (!move) return
    e.preventDefault()
    const nd = Math.min(dates.length - 1, Math.max(0, d + move[0])), nk = Math.min(GRID_ROWS - 1, Math.max(0, k + move[1]))
    setCur([nd, nk]); box.current?.querySelector<HTMLElement>(`[data-pos="${nd}:${nk}"]`)?.focus()
  }
  return <div className="heat" role="grid" aria-label={label} data-testid={testId} ref={box}>
    <div className="heat-row head" role="row"><span />{dates.map(date => <span key={date} role="columnheader" className={date === marked ? "on" : ""}>{dayName(date)}<b>{fromISO(date).getDate()}</b></span>)}</div>
    {Array.from({ length: GRID_ROWS }, (_, k) => <div key={k} className="heat-row" role="row">
      <span className="heat-h" aria-hidden="true" data-h={hourTag(GRID_FROM + k * GRID_STEP)} />
      {dates.map((_, d) => {
        const c = cell(d, k)
        return <button key={d} type="button" role="gridcell" data-pos={`${d}:${k}`} tabIndex={cur[0] === d && cur[1] === k ? 0 : -1}
          className={`heat-cell${c.on ? " on" : ""}${c.all ? " all" : ""}${c.ring ? " ring" : ""}`} style={{ "--a": c.a } as CSSProperties}
          aria-label={c.label} aria-selected={c.on ?? c.ring ?? false} title={c.label}
          onFocus={() => { setCur([d, k]); onHover?.(d, k) }} onPointerEnter={() => { onEnter?.(d, k); onHover?.(d, k) }}
          onPointerDown={e => { if (onDown && e.pointerType !== "touch") { e.preventDefault(); onDown(d, k) } }}
          onClick={e => { if (e.detail === 0 || (e.nativeEvent as PointerEvent).pointerType === "touch") onActivate(d, k) }}
          onPointerUp={e => { if (!onDown && e.pointerType !== "touch" && e.button === 0) onActivate(d, k) }}
          onKeyDown={e => keys(e, d, k)} />
      })}
    </div>)}
  </div>
}

export function MeetingFinder() {
  const { state, dispatch } = useStore()
  const me = state.people.find(p => p.id === state.viewerId) ?? state.people[0]
  const [date, setDate] = useState(state.today)
  const [duration, setDuration] = useState(30)
  const [ids, setIds] = useState(state.people.map(p => p.id))
  const [week, setWeek] = useState(0)
  const [pick, setPick] = useState<{ date: string; from: number } | null>(null)
  const [peek, setPeek] = useState<{ date: string; from: number } | null>(null)
  const [draft, setDraft] = useState<Set<string> | null>(null)
  const mode = useRef<"add" | "remove">("add")

  const start = addDays(state.today, week * 7)
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const grid = availabilityGrid(state, ids, start)
  const total = Math.max(1, ids.length)
  const result = commonMeetingSlots(state, ids, date, duration)

  // Left grid: drag to paint; the weekly pattern is saved when the pointer is released.
  const mine = slotsToCells(me.freeSlots)
  const cells = draft ?? mine
  const save = (set: Set<string>) => dispatch({ type: "saveProfile", personId: me.id, patch: { ...profilePatch(me), freeSlots: cellsToSlots(set, me.freeSlots) } })
  const painted = (set: Set<string>, d: number, k: number) => { const n = new Set(set), key = cellKey(fromISO(dates[d]).getDay(), k); if (mode.current === "add") n.add(key); else n.delete(key); return n }
  useEffect(() => {
    if (!draft) return
    const up = () => { save(draft); setDraft(null) }, cancel = () => setDraft(null)
    window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cancel)
    return () => { window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel) }
  })

  const shown = peek ?? pick
  const span = shown ? (peek ? GRID_STEP : duration) : 0
  const who = shown ? whoIsFree(state, ids, shown.date, shown.from, shown.from + span) : null
  const fits = pick ? pick.from + duration <= GRID_TO : true
  const choice = pick && fits ? whoIsFree(state, ids, pick.date, pick.from, pick.from + duration) : null

  return <section className="card form-stack" data-testid="meeting-finder" aria-labelledby="mf-h">
    <header><h2 id="mf-h">Find a meeting time</h2><Info>Left: click or drag to paint your own free times; they repeat every week and save when you let go (use View as to edit someone else). Right: the darker the cell, the more chosen officers are free; hover to see who, click to pick a time. Busy weeks, ASU closures, finals and breaks count as not free. Arizona time. No calendar is read and no invite is sent.</Info></header>
    <div className="action-row w2m-nav">
      <button type="button" className="btn small" disabled={week === 0} onClick={() => setWeek(week - 1)} aria-label="Previous week">‹</button>
      <span className="small">{fmtShort(dates[0])} – {fmtShort(dates[6])}</span>
      <button type="button" className="btn small" disabled={week >= 20} onClick={() => setWeek(week + 1)} aria-label="Next week">›</button>
    </div>
    <div className="w2m">
      <div>
        <h3 className="w2m-h">You</h3>
        <SlotGrid label={`${me.name}: your free times`} testId="my-grid" dates={dates} marked={date}
          cell={(d, k) => { const on = cells.has(cellKey(fromISO(dates[d]).getDay(), k)); return { a: 0, on, label: `${dayName(dates[d])} ${clock(GRID_FROM + k * GRID_STEP)} · ${on ? "free" : "not free"}` } }}
          onDown={(d, k) => { mode.current = mine.has(cellKey(fromISO(dates[d]).getDay(), k)) ? "remove" : "add"; setDraft(painted(mine, d, k)) }}
          onEnter={(d, k) => { if (draft) setDraft(painted(draft, d, k)) }}
          onActivate={(d, k) => { mode.current = mine.has(cellKey(fromISO(dates[d]).getDay(), k)) ? "remove" : "add"; save(painted(mine, d, k)) }} />
      </div>
      <div>
        <h3 className="w2m-h">Group</h3>
        <SlotGrid label="Who is free this week" testId="group-grid" dates={dates} marked={date}
          cell={(d, k) => {
            const from = GRID_FROM + k * GRID_STEP, c = grid[d].slots[k].free
            const ring = !!pick && pick.date === dates[d] && from >= pick.from && from < pick.from + duration
            return { a: c / total, all: c === total && ids.length > 0, ring, label: `${dayName(dates[d])} ${fmtShort(dates[d])} ${clock(from)} · ${c} of ${total} free` }
          }}
          onActivate={(d, k) => { const from = GRID_FROM + k * GRID_STEP; setPick({ date: dates[d], from }); setDate(dates[d]) }}
          onHover={(d, k) => setPeek({ date: dates[d], from: GRID_FROM + k * GRID_STEP })} />
        <div className="w2m-legend small muted" aria-hidden="true">0{Array.from({ length: Math.min(total, 5) + 1 }, (_, i) => <i key={i} style={{ "--a": i / Math.min(total, 5) } as CSSProperties} />)}{total}</div>
      </div>
    </div>
    <p className="small w2m-who" role="status" aria-live="polite" onPointerLeave={() => setPeek(null)}>
      {who && shown ? <><b>{dayName(shown.date)} {fmtShort(shown.date)}, {clock(shown.from)}–{clock(shown.from + span)}</b> · Free: {names(who.free)} · Not free: {names(who.busy)}</> : "Hover for names."}
    </p>
    {pick && <div className="action-row" data-testid="picked-time">
      {choice
        ? <><span className="small"><b>{dayName(pick.date)} {fmtShort(pick.date)}, {clock(pick.from)}–{clock(pick.from + duration)}</b> · {choice.free.length} of {ids.length} free</span><a className="btn small" target="_blank" rel="noreferrer" href={calendarDraftUrl(pick.date, hhmm(pick.from), hhmm(pick.from + duration))} aria-label="Open Calendar draft for picked time">Draft</a></>
        : <span className="small">Ends after 10 pm. Pick an earlier time.</span>}
      <button type="button" className="btn small" onClick={() => setPick(null)}>Clear</button>
    </div>}
    <div className="action-row">
      <label className="field-inline">Meeting date<input type="date" min={state.today} value={date} onChange={e => { setDate(e.target.value); setPick(null) }} /></label>
      <label className="field-inline">Length<select aria-label="Meeting length" value={duration} onChange={e => setDuration(Number(e.target.value))}>{[15, 30, 60, 90].map(m => <option key={m} value={m}>{m} min</option>)}</select></label>
    </div>
    <fieldset className="who-picks"><legend className="small muted">Attendees</legend>{state.people.map(p => <label className="check-label" key={p.id}><input type="checkbox" checked={ids.includes(p.id)} onChange={e => setIds(e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id))} />{p.name}</label>)}</fieldset>
    {result.reason ? <p role="status" className="small">{result.reason}</p> : <div className="action-row">{result.slots.map(slot => <a key={slot.from} className="btn small" target="_blank" rel="noreferrer" href={calendarDraftUrl(date, slot.from, slot.to)} aria-label="Open Calendar draft">{slot.from}–{slot.to}</a>)}</div>}
  </section>
}
