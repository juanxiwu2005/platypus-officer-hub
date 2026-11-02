import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { useStore } from "../data/store";
import { profilePatch } from "../data/settings";
import { Info } from "./ui";
import { GRID_FROM, GRID_ROWS, GRID_STEP, GRID_TO, availabilityGrid, availabilityKey, availableAt, calendarDraftUrl, cellKey, cellsToSlots, commonMeetingSlots, hhmm, slotsToCells, sundayOf, weeklySlotsOn, whoIsFree } from "../engine/team";
import { addDays, fmtShort, fromISO } from "../lib/dates";
const clock = (m) => `${((Math.floor(m / 60) + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")} ${m < 720 ? "am" : "pm"}`;
const asMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const hourTag = (m) => m % 60 === 0 ? `${((Math.floor(m / 60) + 11) % 12) + 1}${m < 720 ? "a" : "p"}` : "";
const dayName = (date) => fromISO(date).toLocaleDateString("en-US", { weekday: "short" });
const names = (list) => list.length ? list.map(p => p.name.split(" ")[0]).join(", ") : "nobody";
/** One week of half-hour cells. Used twice: the personal grid (left) and the group grid (right). */
function SlotGrid({ label, testId, dates, marked, cell, onDown, onEnter, onDrawEnd, onActivate, onHover }) {
    const box = useRef(null);
    const drawing = useRef(false);
    const lastPainted = useRef(null);
    const [cur, setCur] = useState([0, 0]);
    // Arrow keys move between cells; only one cell is a tab stop so keyboard users do not tab through 196 buttons.
    const keys = (e, d, k) => {
        const move = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key];
        if (!move)
            return;
        e.preventDefault();
        const nd = Math.min(dates.length - 1, Math.max(0, d + move[0])), nk = Math.min(GRID_ROWS - 1, Math.max(0, k + move[1]));
        setCur([nd, nk]);
        box.current?.querySelector(`[data-pos="${nd}:${nk}"]`)?.focus();
    };
    const paintThrough = (d, k) => {
        if (!onEnter)
            return;
        const [lastDay, lastRow] = lastPainted.current ?? [d, k];
        // Pointer events can be coalesced while someone moves quickly. Fill the direct path
        // between the last observed cell and this one so no half-hours are skipped.
        const steps = Math.max(Math.abs(d - lastDay), Math.abs(k - lastRow));
        for (let i = 1; i <= steps; i++)
            onEnter(Math.round(lastDay + (d - lastDay) * i / steps), Math.round(lastRow + (k - lastRow) * i / steps));
        lastPainted.current = [d, k];
    };
    const stopDrawing = () => {
        const wasDrawing = drawing.current;
        drawing.current = false;
        lastPainted.current = null;
        if (wasDrawing)
            onDrawEnd?.();
    };
    return _jsxs("div", { className: "heat", role: "grid", "aria-label": label, "data-testid": testId, ref: box, onPointerMove: e => {
            if (!drawing.current || !onEnter)
                return;
            const target = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-pos]");
            if (!target)
                return;
            const [d, k] = target.dataset.pos.split(":").map(Number);
            paintThrough(d, k);
        }, onPointerUp: stopDrawing, onPointerCancel: stopDrawing, children: [_jsxs("div", { className: "heat-row head", role: "row", children: [_jsx("span", {}), dates.map(date => _jsxs("span", { role: "columnheader", className: date === marked ? "on" : "", children: [dayName(date), _jsx("b", { children: fromISO(date).getDate() })] }, date))] }), Array.from({ length: GRID_ROWS }, (_, k) => _jsxs("div", { className: "heat-row", role: "row", children: [_jsx("span", { className: "heat-h", "aria-hidden": "true", "data-h": hourTag(GRID_FROM + k * GRID_STEP) }), dates.map((_, d) => {
                        const c = cell(d, k);
                        return _jsx("button", { type: "button", role: "gridcell", "data-pos": `${d}:${k}`, tabIndex: cur[0] === d && cur[1] === k ? 0 : -1, className: `heat-cell${c.on ? " on" : ""}${c.all ? " all" : ""}${c.ring ? " ring" : ""}`, style: { "--a": c.a }, "aria-label": c.label, "aria-selected": c.on ?? c.ring ?? false, title: c.label, onFocus: () => { setCur([d, k]); onHover?.(d, k); }, onPointerEnter: () => { if (drawing.current)
                                paintThrough(d, k); onHover?.(d, k); }, onPointerDown: e => { if (onDown && e.pointerType !== "touch" && e.button === 0) {
                                e.preventDefault();
                                drawing.current = true;
                                lastPainted.current = [d, k];
                                e.currentTarget.setPointerCapture(e.pointerId);
                                onDown(d, k);
                            } }, onClick: e => { if (e.detail === 0 || e.nativeEvent.pointerType === "touch")
                                onActivate(d, k); }, onPointerUp: e => { if (!onDown && e.pointerType !== "touch" && e.button === 0)
                                onActivate(d, k); }, onKeyDown: e => keys(e, d, k) }, d);
                    })] }, k))] });
}
export function MeetingFinder() {
    const { state, dispatch } = useStore();
    const me = state.people.find(p => p.id === state.viewerId) ?? state.people[0];
    const [date, setDate] = useState(state.today);
    const [duration, setDuration] = useState(30);
    const [ids, setIds] = useState(state.people.map(p => p.id));
    const [week, setWeek] = useState(0);
    const [pick, setPick] = useState(null);
    const [peek, setPeek] = useState(null);
    const [draft, setDraft] = useState(null);
    const [weeklyDraft, setWeeklyDraft] = useState(null);
    const mode = useRef("add");
    const draftRef = useRef(null);
    // This week stays visible from Sunday through Saturday, including its earlier days.
    // Future navigation advances in complete calendar weeks instead of splitting a week at today.
    const start = addDays(sundayOf(state.today), week * 7);
    const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const grid = availabilityGrid(state, ids, start);
    const total = Math.max(1, ids.length);
    const upcoming = Array.from({ length: 14 }, (_, offset) => {
        const date = addDays(state.today, offset);
        return { date, slots: commonMeetingSlots(state, ids, date, duration).slots };
    }).filter(day => day.slots.length);
    // The weekly template and the dated view are separate. A dated change creates only an exception for that week.
    const weeklyCells = slotsToCells(weeklySlotsOn(me, state.today));
    const dateCell = (d, k) => `${dates[d]}:${k}`;
    const actualCells = new Set(dates.flatMap((date, d) => Array.from({ length: GRID_ROWS }, (_, k) => availableAt(me, date, GRID_FROM + k * GRID_STEP) ? dateCell(d, k) : null).filter((x) => !!x)));
    const cells = draft ?? actualCells;
    const paint = (set, key) => { const n = new Set(set); if (mode.current === "add")
        n.add(key);
    else
        n.delete(key); return n; };
    const saveExceptions = (set) => {
        const overrides = { ...(me.availabilityOverrides ?? {}) };
        dates.forEach((date, d) => Array.from({ length: GRID_ROWS }, (_, k) => {
            const key = availabilityKey(date, GRID_FROM + k * GRID_STEP), template = weeklyCells.has(cellKey(fromISO(date).getDay(), k)), actual = set.has(dateCell(d, k));
            if (actual === template)
                delete overrides[key];
            else
                overrides[key] = actual;
        }));
        dispatch({ type: "saveProfile", personId: me.id, patch: { ...profilePatch(me), availabilityOverrides: overrides } });
    };
    const saveWeekly = (set) => {
        const freeSlots = cellsToSlots(set, me.freeSlots);
        const existing = me.weeklyAvailabilityHistory?.filter(v => v.startsOn < state.today) ?? [{ startsOn: "0000-01-01", freeSlots: me.freeSlots }];
        dispatch({ type: "saveProfile", personId: me.id, patch: { ...profilePatch(me), freeSlots, weeklyAvailabilityHistory: [...existing, { startsOn: state.today, freeSlots }] } });
    };
    const commitExceptions = () => {
        if (!draftRef.current)
            return;
        saveExceptions(draftRef.current);
        draftRef.current = null;
        setDraft(null);
    };
    useEffect(() => {
        if (!draft)
            return;
        // The grid itself commits on pointer-up. This remains as a fallback if the pointer is released outside it.
        const up = commitExceptions, cancel = () => { draftRef.current = null; setDraft(null); };
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", cancel);
        return () => { window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel); };
    }, [draft, dates.join("|")]);
    const shown = peek ?? pick;
    const span = shown ? (peek ? GRID_STEP : duration) : 0;
    const who = shown ? whoIsFree(state, ids, shown.date, shown.from, shown.from + span) : null;
    const fits = pick ? pick.from + duration <= GRID_TO : true;
    const choice = pick && fits ? whoIsFree(state, ids, pick.date, pick.from, pick.from + duration) : null;
    return _jsxs("section", { className: "card form-stack", "data-testid": "meeting-finder", "aria-labelledby": "mf-h", children: [_jsxs("header", { children: [_jsx("h2", { id: "mf-h", children: "Meeting time" }), _jsx(Info, { children: "Use Edit weekly schedule for your recurring availability. Painting this week makes a one-week exception. Darker means more people free." })] }), !weeklyDraft && _jsxs(_Fragment, { children: [_jsxs("div", { className: "action-row w2m-nav", children: [_jsx("button", { type: "button", className: "btn small", disabled: week === 0, onClick: () => setWeek(week - 1), "aria-label": "Previous week", children: "\u2039" }), _jsxs("span", { className: "small", children: [fmtShort(dates[0]), " \u2013 ", fmtShort(dates[6])] }), _jsx("button", { type: "button", className: "btn small", disabled: week >= 20, onClick: () => setWeek(week + 1), "aria-label": "Next week", children: "\u203A" })] }), _jsxs("div", { className: "w2m", children: [_jsxs("div", { children: [_jsxs("div", { className: "w2m-person-head", children: [_jsx("h3", { className: "w2m-h", children: "You" }), _jsx("button", { type: "button", className: "btn small", onClick: () => setWeeklyDraft(new Set(weeklyCells)), children: "Edit weekly schedule" })] }), _jsx(SlotGrid, { label: `${me.name}: your free times`, testId: "my-grid", dates: dates, marked: date, cell: (d, k) => { const on = cells.has(dateCell(d, k)); return { a: 0, on, label: `${dayName(dates[d])} ${clock(GRID_FROM + k * GRID_STEP)} · ${on ? "free" : "not free"}` }; }, onDown: (d, k) => { mode.current = cells.has(dateCell(d, k)) ? "remove" : "add"; const next = paint(cells, dateCell(d, k)); draftRef.current = next; setDraft(next); }, onEnter: (d, k) => { if (draftRef.current)
                                            setDraft(prev => { const next = paint(prev ?? cells, dateCell(d, k)); draftRef.current = next; return next; }); }, onDrawEnd: commitExceptions, onActivate: (d, k) => { mode.current = cells.has(dateCell(d, k)) ? "remove" : "add"; saveExceptions(paint(cells, dateCell(d, k))); } })] }), _jsxs("div", { children: [_jsx("h3", { className: "w2m-h", children: "Group" }), _jsx(SlotGrid, { label: "Who is free this week", testId: "group-grid", dates: dates, marked: date, cell: (d, k) => {
                                            const from = GRID_FROM + k * GRID_STEP, c = grid[d].slots[k].free;
                                            const ring = !!pick && pick.date === dates[d] && from >= pick.from && from < pick.from + duration;
                                            return { a: c / total, all: c === total && ids.length > 0, ring, label: `${dayName(dates[d])} ${fmtShort(dates[d])} ${clock(from)} · ${c} of ${total} free` };
                                        }, onActivate: (d, k) => { const from = GRID_FROM + k * GRID_STEP; setPick({ date: dates[d], from }); setDate(dates[d]); }, onHover: (d, k) => setPeek({ date: dates[d], from: GRID_FROM + k * GRID_STEP }) }), _jsxs("div", { className: "w2m-legend small muted", "aria-hidden": "true", children: ["0", Array.from({ length: Math.min(total, 5) + 1 }, (_, i) => _jsx("i", { style: { "--a": i / Math.min(total, 5) } }, i)), total] })] })] })] }), weeklyDraft && _jsxs("section", { className: "weekly-editor", "aria-label": "Edit weekly schedule", "data-testid": "weekly-schedule-editor", children: [_jsxs("header", { children: [_jsx("h3", { children: "Weekly schedule" }), _jsx("span", { className: "small muted", children: "This becomes your default from today onward. Earlier weeks stay unchanged." })] }), _jsx(SlotGrid, { label: `${me.name}: weekly schedule`, testId: "weekly-grid", dates: dates, marked: "", cell: (d, k) => { const on = weeklyDraft.has(cellKey(fromISO(dates[d]).getDay(), k)); return { a: 0, on, label: `${dayName(dates[d])} ${clock(GRID_FROM + k * GRID_STEP)} · ${on ? "free" : "not free"}` }; }, onDown: (d, k) => { const key = cellKey(fromISO(dates[d]).getDay(), k); mode.current = weeklyDraft.has(key) ? "remove" : "add"; const next = paint(weeklyDraft, key); draftRef.current = next; setWeeklyDraft(next); }, onEnter: (d, k) => { if (draftRef.current)
                            setWeeklyDraft(prev => { const next = paint(prev ?? weeklyDraft, cellKey(fromISO(dates[d]).getDay(), k)); draftRef.current = next; return next; }); }, onActivate: (d, k) => { const key = cellKey(fromISO(dates[d]).getDay(), k); mode.current = weeklyDraft.has(key) ? "remove" : "add"; setWeeklyDraft(paint(weeklyDraft, key)); } }), _jsxs("div", { className: "action-row", children: [_jsx("button", { type: "button", className: "btn btn-primary", onClick: () => { saveWeekly(weeklyDraft); draftRef.current = null; setWeeklyDraft(null); }, children: "Done" }), _jsx("button", { type: "button", className: "btn", onClick: () => { draftRef.current = null; setWeeklyDraft(null); }, children: "Cancel" })] })] }), !weeklyDraft && _jsx("p", { className: "small w2m-who", role: "status", "aria-live": "polite", onPointerLeave: () => setPeek(null), children: who && shown ? _jsxs(_Fragment, { children: [_jsxs("b", { children: [dayName(shown.date), " ", fmtShort(shown.date), ", ", clock(shown.from), "\u2013", clock(shown.from + span)] }), " \u00B7 Free: ", names(who.free), " \u00B7 Not free: ", names(who.busy)] }) : "Hover for names." }), !weeklyDraft && pick && _jsxs("div", { className: "action-row", "data-testid": "picked-time", children: [choice
                        ? _jsxs(_Fragment, { children: [_jsxs("span", { className: "small", children: [_jsxs("b", { children: [dayName(pick.date), " ", fmtShort(pick.date), ", ", clock(pick.from), "\u2013", clock(pick.from + duration)] }), " \u00B7 ", choice.free.length, " of ", ids.length, " free"] }), _jsx("a", { className: "btn small", target: "_blank", rel: "noreferrer", href: calendarDraftUrl(pick.date, hhmm(pick.from), hhmm(pick.from + duration)), "aria-label": "Open Calendar draft for picked time", children: "Draft" })] })
                        : _jsx("span", { className: "small", children: "Ends after 10 pm. Pick an earlier time." }), _jsx("button", { type: "button", className: "btn small", onClick: () => setPick(null), children: "Clear" })] }), !weeklyDraft && _jsxs("div", { className: "meeting-planner", children: [_jsxs("div", { className: "meeting-filters", children: [_jsxs("label", { className: "field-inline", children: ["Length", _jsx("select", { "aria-label": "Meeting length", value: duration, onChange: e => setDuration(Number(e.target.value)), children: [15, 30, 60, 90].map(m => _jsxs("option", { value: m, children: [m, " min"] }, m)) })] }), _jsxs("fieldset", { className: "who-picks", children: [_jsx("legend", { className: "small muted", children: "Attendees" }), state.people.map(p => _jsxs("label", { className: "check-label", children: [_jsx("input", { type: "checkbox", checked: ids.includes(p.id), onChange: e => setIds(e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id)) }), p.name] }, p.id))] })] }), _jsxs("section", { className: "meeting-suggestions", "aria-live": "polite", "aria-label": "Shared times in the next two weeks", children: [_jsx("header", { children: _jsx("h3", { children: "Shared times" }) }), upcoming.length ? upcoming.map(day => _jsxs("div", { className: "suggestion-day", children: [_jsxs("time", { dateTime: day.date, children: [dayName(day.date), " ", fmtShort(day.date)] }), _jsx("div", { children: day.slots.map(slot => _jsxs("button", { type: "button", className: "btn small", onClick: () => { const from = asMinutes(slot.from); setPick({ date: day.date, from }); setDate(day.date); }, children: [slot.from, "\u2013", slot.to] }, slot.from)) })] }, day.date)) : _jsx("p", { className: "small muted", children: "No shared time in the next two weeks. Adjust length or attendees." })] })] })] });
}
