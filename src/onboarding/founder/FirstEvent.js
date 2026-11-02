import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { BUFFER_CHOICES } from "../../data/settings";
import { useStore } from "../../data/store";
import { prefersReducedMotion } from "../../lib/motion";
import { onboardingCopy } from "../copy";
import { useOnboardingDraft } from "../draft";
import { useFlow } from "../engine/useFlow";
import { bufferExample } from "./firstEvent/bufferExample";
import { fmtLong } from "../../lib/dates";
import { EventChain } from "./firstEvent/EventChain";
import { chainDots, prepareEvent, previewFor } from "./firstEvent/plan";
const c = onboardingCopy.founder.firstEvent;
const TYPES = ["social", "speaker", "workshop", "meeting", "fundraiser", "offcampus"];
const FUNDING = [{ value: "none", label: "None" }, { value: "usg", label: "USG" }, { value: "college", label: "College" }, { value: "dues", label: "Dues" }, { value: "sponsor", label: "Sponsor" }];
const FOOD = [{ value: "none", label: "None" }, { value: "dining", label: "Sun Devil Dining" }, { value: "offsite", label: "Outside caterer" }, { value: "onsite", label: "Prepared on site" }, { value: "tbd", label: "Yes, decide how later" }];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
/**
 * Screen 5, the witness moment: one sentence becomes the first event, and its progress chain draws itself with dates from the rule engine.
 * Everything lives in the shared draft (event, date, source, buffer), so Back/Continue and a reload keep it. The chain plays once per press of
 * Plan it; turning the buffer or editing a field only changes the dates and never replays it.
 */
export function FirstEvent() {
    const { state } = useStore();
    const { draft, patch } = useOnboardingDraft();
    const flow = useFlow();
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState("");
    const [stale, setStale] = useState(false); // the sentence changed after the last plan
    const [play, setPlay] = useState(0); // a new number remounts the chain, which restarts the drawing
    const [drawing, setDrawing] = useState(null);
    const [open, setOpen] = useState(false);
    const request = useRef(0);
    const played = useRef(0);
    useEffect(() => () => { request.current = -1; }, []); // an answer that arrives after leaving the screen is dropped
    const { event, date, buffer } = draft;
    const example = useMemo(() => bufferExample(state.today, buffer), [state.today, buffer]);
    const preview = useMemo(() => previewFor(state, draft.club, event, date, draft.inviteCode, draft.steps, buffer), [state, draft.club, event, date, draft.inviteCode, draft.steps, buffer]);
    const dots = useMemo(() => chainDots(preview), [preview]);
    const needsDate = !!event && !preview;
    useEffect(() => { if (needsDate)
        setOpen(true); }, [needsDate]);
    async function plan() {
        const sentence = draft.sentence.trim();
        if (!sentence)
            return;
        const id = ++request.current;
        setBusy(true);
        setNotice("");
        const result = await prepareEvent(state, draft.club, sentence);
        if (id !== request.current)
            return; // a newer press (or leaving the screen) owns the answer
        setBusy(false);
        if (!result.ok) {
            setNotice(result.notice);
            return;
        }
        patch({ event: result.event, date: result.date, source: result.source, confirmed: false });
        setStale(false);
        const n = ++played.current;
        setPlay(n);
        setDrawing(prefersReducedMotion() ? null : n);
    }
    const edit = (sentence) => { patch({ sentence }); setStale(true); };
    const eventPatch = (next) => { if (event)
        patch({ event: { ...event, ...next }, confirmed: false }); };
    return _jsxs("section", { className: "ob-card ob6", "data-testid": "first-event", children: [_jsx("h1", { children: c.title }), _jsx("textarea", { className: "ob6-sentence", "aria-label": c.sentenceLabel, maxLength: 1000, rows: 3, value: draft.sentence, onChange: e => edit(e.target.value) }), _jsx("div", { className: "ob6-examples", role: "group", "aria-label": c.examplesLabel, children: c.examples.map(x => _jsx("button", { type: "button", className: "chip", onClick: () => edit(x.sentence), children: x.label }, x.label)) }), _jsx("div", { className: "ob-actions", children: _jsx("button", { type: "button", className: "btn btn-primary", disabled: !draft.sentence.trim(), onClick: () => void plan(), children: busy ? c.planning : c.cta }) }), _jsx("p", { className: "small muted ob6-note", role: "status", children: notice || (stale && preview ? c.stale : "") }), needsDate && _jsx("p", { className: "ob6-warn", role: "alert", children: c.dateError }), preview && event && _jsxs(_Fragment, { children: [_jsx(EventChain, { dots: dots, today: state.today, drawing: drawing === play && play > 0, stale: stale, onDrawn: () => setDrawing(null) }, play), _jsxs("div", { className: "ob6-buffer", children: [_jsxs("span", { id: "ob6-buffer-label", className: "ob6-buffer-label", children: [c.buffer, " \u00B7 ", c.days] }), _jsx("div", { className: "seg ob6-seg", role: "group", "aria-labelledby": "ob6-buffer-label", children: BUFFER_CHOICES.map(n => _jsx("button", { type: "button", "aria-pressed": buffer === n, "aria-label": `${n} ${n === 1 ? c.day : c.days}`, onClick: () => patch({ buffer: n }), children: n }, n)) }), _jsx("p", { className: "small ob6-example", "data-testid": "buffer-example", children: c.bufferExample.replace("{official}", fmtLong(example.official)).replace("{club}", fmtLong(example.club)) })] })] }), event && _jsxs("details", { className: "ob6-details", open: open, onToggle: e => setOpen(e.currentTarget.open), children: [_jsx("summary", { children: c.details }), _jsxs("p", { className: "small muted", children: [c.fields.source, ": ", draft.source] }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { children: [c.fields.name, _jsx("input", { maxLength: 80, value: event.name, onChange: e => eventPatch({ name: e.target.value }) })] }), _jsxs("label", { children: [c.fields.date, _jsx("input", { type: "date", min: state.today, value: date, "aria-invalid": needsDate, onChange: e => patch({ date: e.target.value, confirmed: false }) })] }), _jsxs("label", { children: [c.fields.type, _jsx("select", { value: event.type, onChange: e => eventPatch({ type: e.target.value }), children: TYPES.map(t => _jsx("option", { value: t, children: cap(t) }, t)) })] }), _jsxs("label", { children: [c.fields.headcount, _jsx("input", { type: "number", min: "1", max: "5000", value: event.headcount, onChange: e => eventPatch({ headcount: Number(e.target.value) }) })] }), _jsxs("label", { children: [c.fields.venue, _jsxs("select", { value: event.venue, onChange: e => eventPatch({ venue: e.target.value }), children: [_jsx("option", { value: "campus", children: "Campus" }), _jsx("option", { value: "offcampus", children: "Off campus" })] })] }), _jsxs("label", { children: [c.fields.food, _jsx("select", { value: event.food, onChange: e => eventPatch({ food: e.target.value }), children: FOOD.map(f => _jsx("option", { value: f.value, children: f.label }, f.value)) })] }), _jsxs("label", { children: [c.fields.funding, _jsx("select", { value: event.funding, onChange: e => eventPatch({ funding: e.target.value }), children: FUNDING.map(f => _jsx("option", { value: f.value, children: f.label }, f.value)) })] }), _jsxs("label", { className: "check-label", children: [_jsx("input", { type: "checkbox", checked: event.speaker, onChange: e => eventPatch({ speaker: e.target.checked }) }), c.fields.speaker] })] })] }), _jsxs("div", { className: "ob-actions ob6-foot", children: [_jsx("button", { type: "button", className: "btn", onClick: () => flow?.back(), children: onboardingCopy.back }), _jsx("button", { type: "button", className: "btn btn-primary", disabled: !preview || stale || busy, onClick: () => flow?.next(), children: onboardingCopy.next })] })] });
}
