import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useStore, useViewer } from "../../data/store";
import { respond, reviewEvent, SUGGESTIONS, ruleById } from "../../lib/assistant";
import { PAGES } from "../../routes";
import { fmtLong, fmtShort } from "../../lib/dates";
import { FINALS, findPeriod } from "../../engine/calendar";
import { sanitizeOps } from "../../lib/commands";
import { NodePill } from "../ui";
import { Feedback } from "../Feedback";
import { useRail } from "./RailContext";
import { AppliedCard, ChangeCard } from "./ChangeCard";
import { Bts, BtsRow } from "../Bts";
import { OwnerPicker, ownersToPeople, TaskDueFields } from "./TaskFields";
import { canCreateEvent, canLead } from "../../data/changeReview";
import { policySourceById } from "../../data/policyCatalog";
const CHAT_KEY = "platypus.v1.chat";
const load = () => {
    try {
        const v = JSON.parse(window.localStorage.getItem(CHAT_KEY) ?? "[]");
        return Array.isArray(v) ? v.slice(-60) : [];
    }
    catch {
        return [];
    }
};
const save = (m) => { try {
    window.localStorage.setItem(CHAT_KEY, JSON.stringify(m.slice(-60)));
}
catch { /* storage unavailable */ } };
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
/** The Ask tab: the one AI conversation, available from every page (v1.1 decision 1). */
export function AskPanel() {
    const { state, dispatch } = useStore();
    const { person } = useViewer();
    const rail = useRail();
    const location = useLocation();
    const [messages, setMessages] = useState(load);
    const messagesRef = useRef(messages);
    messagesRef.current = messages;
    // Messages that were already there when the panel opened do not animate; only ones added afterwards do (DX-17).
    const alreadyThere = useRef(new Set(messages.map(m => m.id)));
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);
    const [focusOff, setFocusOff] = useState(null);
    const list = useRef(null);
    const input = useRef(null);
    useEffect(() => save(messages), [messages]);
    useEffect(() => {
        const clear = () => setMessages([]);
        window.addEventListener("platypus:reset", clear);
        return () => window.removeEventListener("platypus:reset", clear);
    }, []);
    useEffect(() => { list.current?.scrollTo?.({ top: list.current.scrollHeight, behavior: "smooth" }); }, [messages.length, busy]);
    // M2b: once a new event is approved, review its plan with the organizer's own details. The request stays in the
    // rail until the result is in this panel, so a panel that closes mid-review (on a phone) runs it again on reopen.
    const toReview = rail.reviewEventId;
    const reviewing = useRef(null);
    const mounted = useRef(true);
    useEffect(() => () => { mounted.current = false; }, []);
    useEffect(() => {
        if (!toReview || reviewing.current === toReview || !state.events.some(e => e.id === toReview))
            return;
        reviewing.current = toReview;
        setBusy(true);
        reviewEvent(state, toReview).then(reply => {
            if (!mounted.current)
                return;
            if (reply.changeSet)
                dispatch({ type: "draftChanges", changeSet: reply.changeSet });
            setMessages(m => [...m, { id: uid(), role: "assistant", cards: reply.cards, source: reply.source }]);
            rail.takeReview();
        }).catch(() => { if (mounted.current)
            rail.takeReview(); }).finally(() => { if (mounted.current) {
            setBusy(false);
            reviewing.current = null;
        } });
    }, [toReview, state]);
    const focus = useMemo(() => {
        const d = rail.detail;
        if (d && (d.kind === "node" || d.kind === "task" || d.kind === "nudge")) {
            const n = state.nodes.find(x => x.id === d.id);
            if (n)
                return { kind: "node", id: n.id, title: n.title };
        }
        if (d?.kind === "funding") {
            const e = state.events.find(x => x.id === d.eventId);
            if (e)
                return { kind: "event", id: e.id, title: `${e.name} funding` };
        }
        if (location.pathname === "/events") {
            const e = state.events.find(x => x.id === new URLSearchParams(location.search).get("event")) ?? state.events[0];
            if (e)
                return { kind: "event", id: e.id, title: e.name };
        }
        const page = PAGES.find(p => p.path === location.pathname);
        return page ? { kind: "page", id: page.path, title: page.label } : null;
    }, [rail.detail, location.pathname, location.search, state.nodes, state.events]);
    const activeFocus = focus && focusOff !== `${focus.kind}:${focus.id}` ? focus : null;
    async function send(raw) {
        const t = raw.trim();
        if (!t || busy)
            return;
        const user = { id: uid(), role: "user", text: t };
        setMessages(m => [...m, user]);
        setText("");
        setBusy(true);
        try {
            const reply = await respond(t, state, person.id, activeFocus, location.pathname, messages);
            if (reply.autoSet)
                dispatch({ type: "aiAutoApply", changeSet: reply.autoSet });
            if (reply.changeSet)
                dispatch({ type: "draftChanges", changeSet: reply.changeSet });
            const msgId = uid();
            setMessages(m => [...m, { id: msgId, role: "assistant", cards: reply.cards, source: reply.source }]);
            if (reply.refine)
                void reply.refine.then(r => applyRefine(msgId, r), () => applyRefine(msgId, null));
        }
        catch {
            setMessages(m => [...m, { id: uid(), role: "assistant", cards: [{ kind: "text", text: "Something went wrong. Please try again." }], source: "Platypus" }]);
        }
        finally {
            setBusy(false);
        }
    }
    // Questions sent from elsewhere ("Ask about this rule", "Ask AI about this step").
    useEffect(() => {
        const p = rail.pending;
        if (!p)
            return;
        rail.takePending();
        if (p.send)
            void send(p.text);
        else {
            setText(p.text);
            setTimeout(() => input.current?.focus(), 30);
        }
    }, [rail.pending?.n]);
    /**
     * The assistant's answer to a message whose form is already showing (M2b): it fills the form's untouched fields.
     * If it read the message as something else (a task, not an event, or a question), its reply follows as a new
     * message, unless the person already used the form.
     */
    function applyRefine(msgId, refined) {
        const isForm = (c) => c.kind === "form" || c.kind === "taskform";
        const msg = messagesRef.current.find(x => x.id === msgId);
        const local = msg?.cards?.find(isForm);
        const aiCard = refined?.cards.find(isForm);
        const aiText = refined?.cards.find(c => c.kind === "text");
        const same = !!local && !!aiCard && local.kind === aiCard.kind;
        const update = (fn) => setMessages(m => m.map(x => x.id === msgId ? fn(x) : x));
        const settle = (x, source = x.source) => ({ ...x, source, cards: x.cards?.map(c => isForm(c) ? { ...c, thinking: false } : c) });
        if (!refined)
            return update(x => settle(x, "Platypus · AI didn't answer in time, filled from your words"));
        if (same)
            return update(x => ({
                ...x, source: refined.source,
                cards: x.cards?.map(c => {
                    if (c.kind === "text" && aiText?.kind === "text")
                        return aiText;
                    if (c.kind === "form" && aiCard.kind === "form")
                        return { ...c, thinking: false, ...(c.done ? {} : { ai: aiCard.prefill }) };
                    if (c.kind === "taskform" && aiCard.kind === "taskform")
                        return { ...c, thinking: false, ...(c.done ? {} : { ai: { title: aiCard.title, owners: aiCard.owners, eventId: aiCard.eventId } }) };
                    return c;
                }),
            }));
        update(x => settle(x));
        if (!local || local.done)
            return;
        if (refined.autoSet)
            dispatch({ type: "aiAutoApply", changeSet: refined.autoSet });
        if (refined.changeSet)
            dispatch({ type: "draftChanges", changeSet: refined.changeSet });
        setMessages(m => [...m, { id: uid(), role: "assistant", cards: refined.cards, source: `${refined.source} · second look` }]);
    }
    const patchCard = (msgId, cardIndex, card) => setMessages(m => m.map(x => x.id === msgId ? { ...x, cards: x.cards?.map((c, i) => i === cardIndex ? card : c) } : x));
    /** The filled form becomes a change set straight away; the date is the one the person picked. */
    function submitPlan(msgId, index, c) {
        patchCard(msgId, index, c);
        const op = sanitizeOps([{ ...c.prefill, op: "create_event" }], state)[0];
        if (!op)
            return;
        const id = `change-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        dispatch({ type: "draftChanges", changeSet: { id, sentence: `Plan ${c.prefill.name} on ${c.date}`, ops: [op], status: "pending", source: "Your details + the club playbook" } });
        setMessages(m => [...m,
            { id: uid(), role: "user", text: [c.prefill.name, c.date, `${c.prefill.headcount} people`, `food: ${c.prefill.food && c.prefill.food !== "none" ? FOOD[c.prefill.food] : "no"}`, c.prefill.speaker ? "guest speaker or performer" : null].filter(Boolean).join(" · ") },
            { id: uid(), role: "assistant", cards: [{ kind: "text", text: "Here is the draft. Approve it and I'll check the plan and open its flow chart." }, { kind: "changes", changeSetId: id }], source: "Club playbook" },
        ]);
    }
    /** The task form creates at once, as the viewer, with Undo: one task per owner. */
    function submitTask(msgId, index, c, buffered) {
        const id = `tasks-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const people = ownersToPeople(c.owners, state.people, state.roles);
        const tasks = (people.length ? people : [null]).map(ownerId => ({ title: c.title, ownerId, eventId: c.eventId }));
        dispatch({ type: "createTasks", id, sentence: c.title, tasks, date: c.due, buffered, source: "Your task form" });
        patchCard(msgId, index, { ...c, done: true, changeSetId: id });
    }
    const suggestions = SUGGESTIONS[location.pathname] ?? SUGGESTIONS["/"];
    // The same row sits with the greeting before the first message, and at the foot of the panel afterwards (never both).
    const suggestionRow = _jsx("div", { className: "chips", "aria-label": "Suggestions", children: suggestions.map(s => _jsx("button", { type: "button", className: "chip", onClick: () => send(s), disabled: busy, children: s }, s)) });
    return _jsxs("section", { className: "ask", "aria-label": "Ask Platypus", "data-testid": "ask-panel", children: [_jsxs("header", { className: "ask-head", children: [_jsx("b", { children: "Ask Platypus" }), messages.length > 0 && _jsx("button", { type: "button", className: "btn btn-quiet small", onClick: () => setMessages([]), children: "New chat" })] }), activeFocus && _jsxs("div", { className: "focus-chip", "data-testid": "focus-chip", children: [_jsxs("span", { children: ["Looking at: ", activeFocus.title] }), _jsx("button", { type: "button", "aria-label": "Stop using this context", onClick: () => setFocusOff(`${activeFocus.kind}:${activeFocus.id}`), children: "\u00D7" })] }), !messages.length && _jsxs("div", { className: "ask-welcome", "data-testid": "ask-welcome", children: [_jsxs("p", { className: "ask-hello", children: ["Hi ", person.name.split(" ")[0], ". What do you need?"] }), suggestionRow] }), _jsxs("div", { className: `ask-list${messages.length ? "" : " is-empty"}`, ref: list, "aria-live": "polite", children: [messages.map(m => m.role === "user"
                        ? _jsx("div", { className: `bubble user${alreadyThere.current.has(m.id) ? "" : " is-new"}`, children: m.text }, m.id)
                        : _jsxs("div", { className: `bubble bot${alreadyThere.current.has(m.id) ? "" : " is-new"}`, "data-testid": "bot-reply", children: [m.cards?.map((c, i) => _jsx(CardView, { card: c, onPlan: card => submitPlan(m.id, i, card), onTask: (card, buffered) => submitTask(m.id, i, card, buffered), onMoved: card => patchCard(m.id, i, card) }, i)), m.source && _jsx("span", { className: "ask-source", children: m.source })] }, m.id)), busy && _jsx(Typing, {})] }), messages.length > 0 && suggestionRow, _jsxs("form", { className: "ask-form", onSubmit: e => { e.preventDefault(); void send(text); }, children: [_jsx("textarea", { id: "ask-input", ref: input, rows: 2, maxLength: 1000, value: text, placeholder: "Ask or tell Platypus\u2026", "aria-label": "Message Platypus", onChange: e => setText(e.target.value), onKeyDown: e => { if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void send(text);
                        } } }), _jsx("button", { className: "btn btn-primary", type: "submit", disabled: busy || !text.trim(), "aria-label": "Send", children: "Send" })] })] });
}
function CardView({ card, onPlan, onTask, onMoved }) {
    const { state } = useStore();
    const rail = useRail();
    switch (card.kind) {
        case "text": return _jsx("p", { className: "card-text", children: card.text });
        case "tasks": {
            const nodes = card.nodeIds.map(id => state.nodes.find(n => n.id === id)).filter((n) => !!n);
            return _jsxs("div", { className: "mini-card", "data-testid": "tasks-card", children: [_jsx("b", { children: card.title }), nodes.length ? _jsx("ol", { className: "mini-list", children: nodes.map(n => _jsxs("li", { children: [_jsxs("button", { type: "button", className: "row-btn", onClick: () => rail.show({ kind: "task", id: n.id }), children: [_jsx("span", { className: "mini-title", children: n.title }), _jsxs("span", { className: "mini-meta", children: [_jsx(NodePill, { node: n, small: true }), n.clubDeadline && _jsx("span", { className: "small muted", children: fmtShort(n.clubDeadline) })] })] }), card.remind && n.ownerId && n.status !== "done" && _jsx("button", { type: "button", className: "btn small", onClick: () => rail.show({ kind: "nudge", id: n.id }), children: "Remind" })] }, n.id)) }) : _jsx("p", { className: "small muted", children: "Nothing here right now." })] });
        }
        case "nudge": {
            const n = state.nodes.find(x => x.id === card.nodeId);
            const owner = state.people.find(p => p.id === n?.ownerId);
            if (!n || !owner)
                return _jsx("p", { className: "small muted", children: "That task is no longer open." });
            return _jsxs("div", { className: "mini-card", children: [_jsxs("b", { children: ["Reminder for ", owner.name.split(" ")[0]] }), _jsx("span", { className: "small", children: n.title }), _jsx("button", { type: "button", className: "btn btn-primary small", onClick: () => rail.show({ kind: "nudge", id: n.id }), children: "Open the draft" })] });
        }
        case "rule": return _jsxs("div", { className: "mini-card", "data-testid": "rule-answer", children: [_jsx("p", { className: "pre-line", children: card.answer }), card.citations.length > 0 && _jsx("div", { className: "action-row", children: card.citations.map(id => {
                        const policy = policySourceById(id), rule = ruleById(id), url = policy?.sourceUrl ?? rule?.sources[0].url;
                        return url ? _jsxs("a", { className: "btn small", href: url, target: "_blank", rel: "noreferrer", children: [id, " source \u2197"] }, id) : _jsxs("span", { className: "small muted", children: [id, " source saved"] }, id);
                    }) }), _jsxs("span", { className: "ask-source", children: [card.label, card.citations.length ? ` · checked ${policySourceById(card.citations[0])?.extractedAt ?? ruleById(card.citations[0])?.checkedOn}` : ""] }), _jsx(Feedback, { id: `ask:${card.question}:${card.answer}`, text: card.answer })] });
        case "changes": return _jsx(ChangeCard, { id: card.changeSetId });
        case "applied": return _jsx(AppliedCard, { id: card.changeSetId });
        case "form": return _jsx(PlanForm, { card: card, onDone: onPlan });
        case "review": {
            const ev = state.events.find(e => e.id === card.eventId);
            return _jsxs("div", { className: "mini-card", "data-testid": "event-review", children: [_jsxs("b", { children: ["Plan check", ev ? `: ${ev.name}` : ""] }), card.risks.length ? _jsx("ul", { className: "review-risks", children: card.risks.map((r, i) => _jsxs("li", { children: [r.text, r.rules.map(id => { const rule = ruleById(id); return rule && _jsxs("a", { className: "small", href: rule.sources[0].url, target: "_blank", rel: "noreferrer", children: [" ", id, " \u2197"] }, id); })] }, i)) }) : _jsx("p", { className: "small", children: "Nothing stands out beyond the playbook's steps." }), _jsxs(BtsRow, { children: [card.label.startsWith("AI") ? _jsx(Bts, { kind: "ai", label: card.label, children: "The AI suggested these risks and extra steps from the playbook plus what you wrote. The browser keeps only rule IDs the rule book has and dates the app already knows. POST /api/event/review" }) : _jsx(Bts, { label: card.label, children: "No AI wrote this list. These are the schedule engine's own warnings for the event, each tied to its rule where there is one." }), _jsx(Bts, { label: "Rule engine", children: "Every step date is computed by the schedule engine; the AI never sets a date." })] })] });
        }
        case "eventdate": return _jsx(EventDateCard, { card: card, onDone: onMoved });
        case "taskform": return card.done && card.changeSetId ? _jsx(AppliedCard, { id: card.changeSetId }) : _jsx(TaskForm, { card: card, onDone: onTask });
    }
}
const FOOD = { none: "none", dining: "Sun Devil Dining", offsite: "outside caterer", onsite: "made on site", tbd: "yes" };
const EVENT_CHECKLIST = [
    { key: "funding", label: "Need funding or reimbursement" }, { key: "food", label: "Food or beverage" }, { key: "externalFood", label: "External food provider" }, { key: "onsiteFood", label: "On-site food preparation or food truck" },
    { key: "speaker", label: "External speaker, artist, or performer" }, { key: "partner", label: "Partner, sponsor, co-host, vendor, or contract" }, { key: "travel", label: "Travel or off-site participant trip" }, { key: "parking", label: "Parking, shuttle, loading, or transportation" },
    { key: "advisor", label: "Advisor involvement required" }, { key: "access", label: "Accessibility accommodation or access support" }, { key: "safety", label: "Security, EMS, VIP, media, protest, or elevated safety risk" }, { key: "outdoor", label: "Outdoor special-use setup or equipment" },
    { key: "alcohol", label: "Alcohol" }, { key: "drone", label: "Drone or model aircraft" }, { key: "media", label: "Music, livestream, recording, or media use" }, { key: "prize", label: "Prize, raffle, fundraising, ticket, or donation activity" },
    { key: "schoolApproval", label: "School or college-specific approval" }, { key: "rsvp", label: "RSVP registration needed" },
];
/**
 * The event form (M2b, Juanxi 2026-10-27): only what changes the plan — name, date, people, food yes/no and a
 * guest speaker or performer — plus Details in the person's own words. Place, catering and funding are decided
 * later in the event and finance steps; anything the person already said is kept as it was understood.
 */
function PlanForm({ card, onDone }) {
    const { state } = useStore();
    const allowed = canCreateEvent(state);
    const [f, setF] = useState({ name: card.prefill.name ?? "", type: card.prefill.type ?? (card.prefill.speaker ? "speaker" : "social"), headcount: card.prefill.headcount ?? 30, venue: card.prefill.venue ?? "campus", food: card.prefill.food ?? "none", funding: card.prefill.funding ?? "none", speaker: card.prefill.speaker ?? false, checks: card.prefill.checks ?? {}, details: card.prefill.details ?? "" });
    const [date, setDate] = useState(card.date);
    const [error, setError] = useState("");
    // Fields the person changed are theirs; the assistant's later reading only fills the others.
    const touched = useRef(new Set());
    const edit = (patch) => { Object.keys(patch).forEach(k => touched.current.add(k)); setF(prev => ({ ...prev, ...patch })); };
    const [filled, setFilled] = useState(false);
    useEffect(() => {
        const ai = card.ai;
        if (!ai)
            return;
        setF(prev => {
            const next = { ...prev };
            for (const k of ["name", "headcount", "food", "speaker", "venue", "funding", "type", "checks"]) {
                const v = ai[k];
                if (v !== undefined && v !== "" && !touched.current.has(k))
                    next[k] = v;
            }
            if (ai.details && !touched.current.has("details"))
                next.details = prev.details && !ai.details.includes(prev.details) ? `${ai.details} ${prev.details}` : ai.details;
            return next;
        });
        setFilled(true);
    }, [card.ai]);
    if (card.done)
        return _jsxs("div", { className: "mini-card done", children: [_jsx("b", { children: card.prefill.name }), _jsxs("span", { className: "small muted", children: ["Details sent \u00B7 ", card.date] })] });
    const hasFood = f.food !== "none";
    const toggleCheck = (key, checked) => edit({ checks: { ...f.checks, [key]: checked } });
    const finals = /^\d{4}-\d{2}-\d{2}$/.test(date) ? findPeriod(date, FINALS) : null;
    return _jsxs("form", { className: "mini-card plan-form", "data-testid": "plan-form", autoComplete: "off", onSubmit: e => {
            e.preventDefault();
            if (!allowed)
                return setError("The president chooses who can create events (Settings).");
            if (!f.name.trim())
                return setError("Give the event a name.");
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < state.today)
                return setError("Pick a date from today on.");
            const details = f.details.trim();
            onDone({ ...card, done: true, date, prefill: { ...f, name: f.name.trim(), details: details || undefined } });
        }, children: [_jsx("b", { children: "I need these details" }), card.thinking && _jsx("p", { className: "small muted", "data-testid": "ai-reading", children: "AI is reading your message and will fill in what it can\u2026" }), filled && _jsx("p", { className: "small muted", "data-testid": "ai-filled", children: "AI filled in what you told it. Check and change anything." }), _jsxs("label", { children: ["Event name", _jsx("input", { name: "platypus-event-title", autoComplete: "off", value: f.name, maxLength: 80, onChange: e => edit({ name: e.target.value }), placeholder: "e.g. Founder Dinner" })] }), _jsxs("div", { className: "form-2", children: [_jsxs("label", { children: ["Date", _jsx("input", { type: "date", "aria-label": "Date", value: date, min: state.today, onChange: e => setDate(e.target.value) })] }), _jsxs("label", { children: ["People", _jsx("input", { type: "number", min: 1, max: 5000, value: f.headcount, onChange: e => edit({ headcount: Number(e.target.value) }) })] }), _jsxs("label", { children: ["Food", _jsxs("select", { "aria-label": "Food", value: hasFood ? "yes" : "no", onChange: e => { const yes = e.target.value === "yes"; edit({ food: yes ? (card.prefill.food && card.prefill.food !== "none" ? card.prefill.food : "tbd") : "none", checks: { ...f.checks, food: yes } }); }, children: [_jsx("option", { value: "no", children: "No" }), _jsx("option", { value: "yes", children: "Yes" })] })] })] }), finals && _jsxs("p", { className: "small late-text", role: "alert", "data-testid": "finals-warning", children: [fmtLong(date), " is during ", finals.label, ". ASU does not allow events then (R13)."] }), _jsxs("label", { className: "check-label", children: [_jsx("input", { type: "checkbox", checked: f.speaker, onChange: e => edit({ speaker: e.target.checked, checks: { ...f.checks, speaker: e.target.checked } }) }), "Guest speaker or performer"] }), _jsxs("fieldset", { className: "checklist", children: [_jsx("legend", { children: "Situation-based checklist" }), EVENT_CHECKLIST.filter(x => x.key !== "food" && x.key !== "speaker").map(item => _jsxs("label", { className: "check-label", children: [_jsx("input", { type: "checkbox", checked: f.checks[item.key] === true, onChange: e => toggleCheck(item.key, e.target.checked) }), item.label] }, item.key))] }), _jsxs("label", { children: ["Details", _jsx("textarea", { rows: 3, maxLength: 500, autoComplete: "off", value: f.details, onChange: e => edit({ details: e.target.value }), placeholder: "Anything unusual: a stage build, a company visit, flying out of state, a competition\u2026" })] }), !allowed && _jsx("p", { className: "small muted", children: "The president chooses who can create events." }), error && _jsx("p", { className: "small late-text", role: "alert", children: error }), _jsx("button", { className: "btn btn-primary", type: "submit", disabled: !allowed, children: "Continue" })] });
}
/** The task form (M2b): name, owners as tags, due date, and the club deadline before it. */
function TaskForm({ card, onDone }) {
    const { state } = useStore();
    const [c, setC] = useState(card);
    const [buffered, setBuffered] = useState(true);
    const [error, setError] = useState("");
    const touched = useRef(new Set());
    const edit = (patch) => { Object.keys(patch).forEach(k => touched.current.add(k)); setC(prev => ({ ...prev, ...patch })); };
    const [filled, setFilled] = useState(false);
    useEffect(() => {
        const ai = card.ai;
        if (!ai)
            return;
        setC(prev => ({
            ...prev,
            ...(ai.title && !touched.current.has("title") ? { title: ai.title } : {}),
            ...(ai.owners.length && !touched.current.has("owners") ? { owners: ai.owners } : {}),
        }));
        setFilled(true);
    }, [card.ai]);
    const people = ownersToPeople(c.owners, state.people, state.roles).filter(Boolean).length;
    return _jsxs("form", { className: "mini-card plan-form", "data-testid": "task-form", autoComplete: "off", onSubmit: e => {
            e.preventDefault();
            if (!c.title.trim())
                return setError("Give the task a name.");
            if (!/^\d{4}-\d{2}-\d{2}$/.test(c.due) || c.due < state.today)
                return setError("Pick a due date from today on.");
            onDone({ ...c, title: c.title.trim(), thinking: false }, buffered);
        }, children: [_jsx("b", { children: "New task" }), card.thinking && _jsx("p", { className: "small muted", "data-testid": "ai-reading", children: "AI is reading your message and will fill in what it can\u2026" }), filled && _jsx("p", { className: "small muted", "data-testid": "ai-filled", children: "AI filled in what you told it. Check and change anything." }), _jsxs("label", { children: ["Task name", _jsx("input", { "aria-label": "Task name", name: "platypus-task-title", autoComplete: "off", value: c.title, maxLength: 100, onChange: e => edit({ title: e.target.value }), placeholder: "e.g. Order name tags" })] }), _jsx(OwnerPicker, { value: c.owners, onChange: owners => edit({ owners }) }), people > 1 && _jsxs("p", { className: "small muted", children: ["Makes ", people, " tasks, one for each person, so everyone has their own deadline."] }), !c.owners.length && _jsx("p", { className: "small muted", children: canLead(state) ? "No owner yet: anyone can claim it." : "No owner: it will be yours." }), _jsx(TaskDueFields, { due: c.due, buffered: buffered, onDue: due => edit({ due }), onBuffered: setBuffered }), error && _jsx("p", { className: "small late-text", role: "alert", children: error }), _jsx("button", { className: "btn btn-primary", type: "submit", children: people > 1 ? `Create ${people} tasks` : "Create task" })] });
}
/**
 * Move an event to the date the person typed (M2b). The assistant never supplies this date; the rule engine
 * recomputes every step, and the plan is checked again.
 */
function EventDateCard({ card, onDone }) {
    const { state, dispatch } = useStore();
    const rail = useRail();
    const [eventId, setEventId] = useState(card.eventId);
    const [date, setDate] = useState(card.date);
    const [error, setError] = useState("");
    const ev = state.events.find(e => e.id === eventId);
    const allowed = canCreateEvent(state);
    if (card.done)
        return _jsxs("div", { className: "mini-card done", children: [_jsx("b", { children: ev?.name ?? "Event" }), _jsxs("span", { className: "small muted", children: ["Moved to ", fmtLong(card.date), " \u00B7 steps rescheduled"] })] });
    const finals = /^\d{4}-\d{2}-\d{2}$/.test(date) ? findPeriod(date, FINALS) : null;
    return _jsxs("form", { className: "mini-card plan-form", "data-testid": "event-date", onSubmit: e => {
            e.preventDefault();
            if (!ev)
                return setError("Choose an event.");
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < state.today)
                return setError("Pick a date from today on.");
            dispatch({ type: "updateEvent", id: ev.id, patch: { date } });
            onDone({ ...card, eventId: ev.id, date, done: true });
            rail.requestReview(ev.id);
        }, children: [_jsx("b", { children: "Move an event" }), _jsxs("label", { children: ["Event", _jsx("select", { "aria-label": "Event", value: eventId, onChange: e => setEventId(e.target.value), children: state.events.map(x => _jsx("option", { value: x.id, children: x.name }, x.id)) })] }), ev && _jsxs("p", { className: "small muted", children: ["Now ", fmtLong(ev.date), "."] }), _jsxs("label", { children: ["New date", _jsx("input", { type: "date", "aria-label": "New date", value: date, min: state.today, onChange: e => setDate(e.target.value) })] }), finals && _jsxs("p", { className: "small late-text", role: "alert", children: [fmtLong(date), " is during ", finals.label, ". ASU does not allow events then (R13)."] }), _jsx("p", { className: "small muted", children: "The rule engine reschedules every step, then I check the plan again." }), !allowed && _jsx("p", { className: "small muted", children: "The president chooses who can change events." }), error && _jsx("p", { className: "small late-text", role: "alert", children: error }), _jsx("button", { className: "btn btn-primary", type: "submit", disabled: !allowed, children: "Move event" })] });
}
/** Typing dots; after a few seconds, say why it is taking a while (ASU AIR can take most of a minute). */
function Typing() {
    const [slow, setSlow] = useState(false);
    useEffect(() => { const t = setTimeout(() => setSlow(true), 6000); return () => clearTimeout(t); }, []);
    return _jsxs("div", { className: "ai-wait", "aria-label": "Thinking", children: [_jsxs("span", { className: "ai-wait-mark", "aria-hidden": "true", children: [_jsx("i", {}), _jsx("i", {}), _jsx("i", {})] }), _jsxs("span", { children: [_jsx("b", { children: "Platypus is working" }), _jsx("small", { children: slow ? "The ASU AI is still preparing a careful answer." : "Reading your question and checking the relevant context…" })] })] });
}
