import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import { useStore } from "../data/store"
import { profilePatch } from "../data/settings"
import { Info } from "./ui"
import { GRID_FROM, GRID_ROWS, GRID_STEP, GRID_TO, availabilityGrid, availabilityKey, availableAt, calendarDraftUrl, cellKey, cellsToSlots, commonMeetingSlots, hhmm, slotsToCells, sundayOf, weeklySlotsOn, whoIsFree } from "../engine/team"
import { addDays, fmtShort, fromISO } from "../lib/dates"

const clock = (m: number) => `${((Math.floor(m / 60) + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")} ${m < 720 ? "am" : "pm"}`
const asMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
const hourTag = (m: number) => m % 60 === 0 ? `${((Math.floor(m / 60) + 11) % 12) + 1}${m < 720 ? "a" : "p"}` : ""
const dayName = (date: string) => fromISO(date).toLocaleDateString("en-US", { weekday: "short" })
const names = (list: { name: string }[]) => list.length ? list.map(p => p.name.split(" ")[0]).join(", ") : "nobody"

interface CellInfo { a: number; on?: boolean; all?: boolean; ring?: boolean; label: string }

/** One week of half-hour cells. Used twice: the personal grid (left) and the group grid (right). */
function SlotGrid({ label, testId, dates, marked, cell, onDown, onEnter, onDrawEnd, onActivate, onHover }: {
  label: string; testId: string; dates: string[]; marked: string
  cell: (d: number, k: number) => CellInfo
  onDown?: (d: number, k: number) => void; onEnter?: (d: number, k: number) => void
  onDrawEnd?: () => void
  onActivate: (d: number, k: number) => void; onHover?: (d: number, k: number) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const drawing = useRef(false)
  const lastPainted = useRef<[number, number] | null>(null)
  const [cur, setCur] = useState<[number, number]>([0, 0])
  // Arrow keys move between cells; only one cell is a tab stop so keyboard users do not tab through 196 buttons.
  const keys = (e: KeyboardEvent, d: number, k: number) => {
    const move = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key]
    if (!move) return
    e.preventDefault()
    const nd = Math.min(dates.length - 1, Math.max(0, d + move[0])), nk = Math.min(GRID_ROWS - 1, Math.max(0, k + move[1]))
    setCur([nd, nk]); box.current?.querySelector<HTMLElement>(`[data-pos="${nd}:${nk}"]`)?.focus()
  }
  const paintThrough = (d: number, k: number) => {
    if (!onEnter) return
    const [lastDay, lastRow] = lastPainted.current ?? [d, k]
    // Pointer events can be coalesced while someone moves quickly. Fill the direct path
    // between the last observed cell and this one so no half-hours are skipped.
    const steps = Math.max(Math.abs(d - lastDay), Math.abs(k - lastRow))
    for (let i = 1; i <= steps; i++) onEnter(Math.round(lastDay + (d - lastDay) * i / steps), Math.round(lastRow + (k - lastRow) * i / steps))
    lastPainted.current = [d, k]
  }
  const stopDrawing = () => {
    const wasDrawing = drawing.current
    drawing.current = false; lastPainted.current = null
    if (wasDrawing) onDrawEnd?.()
  }
  return <div className="heat" role="grid" aria-label={label} data-testid={testId} ref={box} onPointerMove={e => {
    if (!drawing.current || !onEnter) return
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-pos]")
    if (!target) return
    const [d, k] = target.dataset.pos!.split(":").map(Number)
    paintThrough(d, k)
  }} onPointerUp={stopDrawing} onPointerCancel={stopDrawing}>
    <div className="heat-row head" role="row"><span />{dates.map(date => <span key={date} role="columnheader" className={date === marked ? "on" : ""}>{dayName(date)}<b>{fromISO(date).getDate()}</b></span>)}</div>
    {Array.from({ length: GRID_ROWS }, (_, k) => <div key={k} className="heat-row" role="row">
      <span className="heat-h" aria-hidden="true" data-h={hourTag(GRID_FROM + k * GRID_STEP)} />
      {dates.map((_, d) => {
        const c = cell(d, k)
        return <button key={d} type="button" role="gridcell" data-pos={`${d}:${k}`} tabIndex={cur[0] === d && cur[1] === k ? 0 : -1}
          className={`heat-cell${c.on ? " on" : ""}${c.all ? " all" : ""}${c.ring ? " ring" : ""}`} style={{ "--a": c.a } as CSSProperties}
          aria-label={c.label} aria-selected={c.on ?? c.ring ?? false} title={c.label}
          onFocus={() => { setCur([d, k]); onHover?.(d, k) }} onPointerEnter={() => { if (drawing.current) paintThrough(d, k); onHover?.(d, k) }}
          onPointerDown={e => { if (onDown && e.pointerType !== "touch" && e.button === 0) { e.preventDefault(); drawing.current = true; lastPainted.current = [d, k]; e.currentTarget.setPointerCapture(e.pointerId); onDown(d, k) } }}
          onClick={e => { if (e.detail === 0 || (!onDown && (e.nativeEvent as PointerEvent).pointerType === "touch")) onActivate(d, k) }}
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
  const [weeklyDraft, setWeeklyDraft] = useState<Set<string> | null>(null)
  const mode = useRef<"add" | "remove">("add")
  const draftRef = useRef<Set<string> | null>(null)

  // This week stays visible from Sunday through Saturday, including its earlier days.
  // Future navigation advances in complete calendar weeks instead of splitting a week at today.
  const start = addDays(sundayOf(state.today), week * 7)
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const grid = availabilityGrid(state, ids, start)
  const total = Math.max(1, ids.length)
  const upcoming = Array.from({ length: 14 }, (_, offset) => {
    const date = addDays(state.today, offset)
    return { date, slots: commonMeetingSlots(state, ids, date, duration).slots }
  }).filter(day => day.slots.length)

  // The weekly template and the dated view are separate. A dated change creates only an exception for that week.
  const weeklyCells = slotsToCells(weeklySlotsOn(me, state.today))
  const dateCell = (d: number, k: number) => `${dates[d]}:${k}`
  const actualCells = new Set(dates.flatMap((date, d) => Array.from({ length: GRID_ROWS }, (_, k) => availableAt(me, date, GRID_FROM + k * GRID_STEP) ? dateCell(d, k) : null).filter((x): x is string => !!x)))
  const cells = draft ?? actualCells
  const paint = (set: Set<string>, key: string) => { const n = new Set(set); if (mode.current === "add") n.add(key); else n.delete(key); return n }
  const saveExceptions = (set: Set<string>) => {
    const overrides = { ...(me.availabilityOverrides ?? {}) }
    dates.forEach((date, d) => Array.from({ length: GRID_ROWS }, (_, k) => {
      const key = availabilityKey(date, GRID_FROM + k * GRID_STEP), template = weeklyCells.has(cellKey(fromISO(date).getDay(), k)), actual = set.has(dateCell(d, k))
      if (actual === template) delete overrides[key]; else overrides[key] = actual
    }))
    dispatch({ type: "saveProfile", personId: me.id, patch: { ...profilePatch(me), availabilityOverrides: overrides } })
  }
  const saveWeekly = (set: Set<string>) => {
    const freeSlots = cellsToSlots(set, me.freeSlots)
    const existing = me.weeklyAvailabilityHistory?.filter(v => v.startsOn < state.today) ?? [{ startsOn: "0000-01-01", freeSlots: me.freeSlots }]
    dispatch({ type: "saveProfile", personId: me.id, patch: { ...profilePatch(me), freeSlots, weeklyAvailabilityHistory: [...existing, { startsOn: state.today, freeSlots }] } })
  }
  const commitExceptions = () => {
    if (!draftRef.current) return
    saveExceptions(draftRef.current)
    draftRef.current = null
    setDraft(null)
  }
  useEffect(() => {
    if (!draft) return
    // The grid itself commits on pointer-up. This remains as a fallback if the pointer is released outside it.
    const up = commitExceptions, cancel = () => { draftRef.current = null; setDraft(null) }
    window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cancel)
    return () => { window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel) }
  }, [draft, dates.join("|")])

  const shown = peek ?? pick
  const span = shown ? (peek ? GRID_STEP : duration) : 0
  const who = shown ? whoIsFree(state, ids, shown.date, shown.from, shown.from + span) : null
  const fits = pick ? pick.from + duration <= GRID_TO : true
  const choice = pick && fits ? whoIsFree(state, ids, pick.date, pick.from, pick.from + duration) : null

  return <section className="card form-stack" data-testid="meeting-finder" aria-labelledby="mf-h">
    <header><h2 id="mf-h">Find a meeting time</h2><Info>Use Edit weekly schedule for your recurring availability. Painting this week makes a one-week exception. Darker means more people free.</Info></header>
    {!weeklyDraft && <><div className="action-row w2m-nav">
      <button type="button" className="btn small" disabled={week === 0} onClick={() => setWeek(week - 1)} aria-label="Previous week">‹</button>
      <span className="small">{fmtShort(dates[0])} – {fmtShort(dates[6])}</span>
      <button type="button" className="btn small" disabled={week >= 20} onClick={() => setWeek(week + 1)} aria-label="Next week">›</button>
    </div>
    <div className="w2m">
      <div>
        <div className="w2m-person-head"><h3 className="w2m-h">You</h3><button type="button" className="btn small" onClick={() => setWeeklyDraft(new Set(weeklyCells))}>Edit weekly schedule</button></div>
        <SlotGrid label={`${me.name}: your free times`} testId="my-grid" dates={dates} marked={date}
          cell={(d, k) => { const on = cells.has(dateCell(d, k)); return { a: 0, on, label: `${dayName(dates[d])} ${clock(GRID_FROM + k * GRID_STEP)} · ${on ? "free" : "not free"}` } }}
          onDown={(d, k) => { mode.current = cells.has(dateCell(d, k)) ? "remove" : "add"; const next = paint(cells, dateCell(d, k)); draftRef.current = next; setDraft(next) }}
          onEnter={(d, k) => { if (draftRef.current) setDraft(prev => { const next = paint(prev ?? cells, dateCell(d, k)); draftRef.current = next; return next }) }}
          onDrawEnd={commitExceptions}
          onActivate={(d, k) => { mode.current = cells.has(dateCell(d, k)) ? "remove" : "add"; saveExceptions(paint(cells, dateCell(d, k))) }} />
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
    </div></>}
    {weeklyDraft && <section className="weekly-editor" aria-label="Edit weekly schedule" data-testid="weekly-schedule-editor">
      <header><h3>Weekly schedule</h3><span className="small muted">This becomes your default from today onward. Earlier weeks stay unchanged.</span></header>
      <SlotGrid label={`${me.name}: weekly schedule`} testId="weekly-grid" dates={dates} marked=""
        cell={(d, k) => { const on = weeklyDraft.has(cellKey(fromISO(dates[d]).getDay(), k)); return { a: 0, on, label: `${dayName(dates[d])} ${clock(GRID_FROM + k * GRID_STEP)} · ${on ? "free" : "not free"}` } }}
        onDown={(d, k) => { const key = cellKey(fromISO(dates[d]).getDay(), k); mode.current = weeklyDraft.has(key) ? "remove" : "add"; const next = paint(weeklyDraft, key); draftRef.current = next; setWeeklyDraft(next) }}
        onEnter={(d, k) => { if (draftRef.current) setWeeklyDraft(prev => { const next = paint(prev ?? weeklyDraft, cellKey(fromISO(dates[d]).getDay(), k)); draftRef.current = next; return next }) }}
        onActivate={(d, k) => { const key = cellKey(fromISO(dates[d]).getDay(), k); mode.current = weeklyDraft.has(key) ? "remove" : "add"; setWeeklyDraft(paint(weeklyDraft, key)) }} />
      <div className="action-row"><button type="button" className="btn btn-primary" onClick={() => { saveWeekly(weeklyDraft); draftRef.current = null; setWeeklyDraft(null) }}>Done</button><button type="button" className="btn" onClick={() => { draftRef.current = null; setWeeklyDraft(null) }}>Cancel</button></div>
    </section>}
    {!weeklyDraft && <p className="small w2m-who" role="status" aria-live="polite" onPointerLeave={() => setPeek(null)}>
      {who && shown ? <><b>{dayName(shown.date)} {fmtShort(shown.date)}, {clock(shown.from)}–{clock(shown.from + span)}</b> · Free: {names(who.free)} · Not free: {names(who.busy)}</> : "Hover for names."}
    </p>}
    {!weeklyDraft && pick && <div className="action-row" data-testid="picked-time">
      {choice
        ? <><span className="small"><b>{dayName(pick.date)} {fmtShort(pick.date)}, {clock(pick.from)}–{clock(pick.from + duration)}</b> · {choice.free.length} of {ids.length} free</span><a className="btn small" target="_blank" rel="noreferrer" href={calendarDraftUrl(pick.date, hhmm(pick.from), hhmm(pick.from + duration))} aria-label="Open Calendar draft for picked time">Draft</a></>
        : <span className="small">Ends after 10 pm. Pick an earlier time.</span>}
      <button type="button" className="btn small" onClick={() => setPick(null)}>Clear</button>
    </div>}
    {!weeklyDraft && <div className="meeting-planner">
      <div className="meeting-filters">
        <label className="field-inline">Length<select aria-label="Meeting length" value={duration} onChange={e => setDuration(Number(e.target.value))}>{[15, 30, 60, 90].map(m => <option key={m} value={m}>{m} min</option>)}</select></label>
        <fieldset className="who-picks"><legend className="small muted">Attendees</legend>{state.people.map(p => <label className="check-label" key={p.id}><input type="checkbox" checked={ids.includes(p.id)} onChange={e => setIds(e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id))} />{p.name}</label>)}</fieldset>
      </div>
      <section className="meeting-suggestions" aria-live="polite" aria-label="Shared times in the next two weeks">
        <header><h3>Shared times</h3><span className="small muted">Next 2 weeks</span></header>
        {upcoming.length ? upcoming.map(day => <div className="suggestion-day" key={day.date}><time dateTime={day.date}>{dayName(day.date)} {fmtShort(day.date)}</time><div>{day.slots.map(slot => <button type="button" className="btn small" key={slot.from} onClick={() => { const from = asMinutes(slot.from); setPick({ date: day.date, from }); setDate(day.date) }}>{slot.from}–{slot.to}</button>)}</div></div>) : <p className="small muted">No shared time in the next two weeks. Try a shorter meeting or fewer attendees.</p>}
      </section>
    </div>}
  </section>
}
