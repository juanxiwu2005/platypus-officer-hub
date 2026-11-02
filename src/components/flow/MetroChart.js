import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { fmtShort } from "../../lib/dates";
import { firstName, worstIssue } from "../../pages/helpers";
import { nodeStop } from "../../lib/phases";
import { useStatusStyles, useTouch } from "../ui";
import { EVENT_KEY, END_KEY, START_KEY, metroLayout } from "./metro";
import { useStore } from "../../data/store";
import { prefersReducedMotion, tokenMs } from "../../lib/motion";
import { nextCounter } from "../../lib/ids";
import { cannotDelete, flowGaps, flowTracks, moveBetween, unlinkSteps } from "../../lib/flowEdit";
import { ancestorsOf, doAfter } from "../../lib/stepOrder";
import { isolateDialog, trapTabKey } from "../../lib/focus";
const SHORT = {
    plan: "Event plan", backup: "Back-up plan", venuechoice: "Candidate venue", registry: "Event Registry", venue: "Book room",
    moderator: "Moderator staffing", materials: "Event materials", checkin: "Check-in forms", headcount: "Headcount",
    thankyou: "Thank you", feedback: "Feedback", postmarketing: "Post marketing", photoBackup: "Photo backup", invoice: "Invoice",
    attendance: "Attendance submit", spending: "Paid reimbursed", financeRecord: "Finance record", documentation: "Documentation",
    partner: "Partner meeting", speakerPacket: "Speaker packet", travel: "Travel plan", partnerReview: "Partner review", parking: "Parking validation",
    budget: "Budget", foodCompliance: "Food exception", quotes: "Quote gather", budgetRequest: "Budget request", budgetApproval: "Budget approval",
    purchaseRequest: "Purchase request", purchaseApproval: "Purchase approval", orderPlaced: "Order placed", advisor: "Advisor", access: "Accessibility",
    security: "Security", eams: "EAMS plan", permit: "Permit insurance", alcohol: "Alcohol permit", drone: "Drone approval", schoolApproval: "School approval",
    marketingNeeds: "Marketing needs", contentCreation: "Content creation", promotionItems: "Promotion items", rsvp: "Open RSVPs", content: "Content distribution", reminder: "Event reminder", finalcheck: "Full check",
};
const SITUATION_KEYS = new Set(["partner", "speakerPacket", "travel", "partnerReview", "parking", "foodCompliance", "budgetRequest", "budgetApproval", "purchaseRequest", "purchaseApproval", "advisor", "access", "security", "eams", "permit", "alcohol", "drone", "schoolApproval", "rsvp"]);
/** Two to four words for the chart; the full title is in the hover card. */
export const shortTitle = (n) => (n.stepKey && SHORT[n.stepKey]) || n.title.split(/\s+/).slice(0, 3).join(" ").replace(/[,:;]$/, "");
const SNAP = 72;
/** One main line; parallel work forks off and merges back. Look → hover → click. */
export function MetroChart({ state, sched, forecast, eventId, selectedId, onSelect, canEdit = false, alwaysEdit = false, editing: requestedEditing, onEditingChange, port: given }) {
    const wrap = useRef(null);
    const canvasRef = useRef(null);
    const { dispatch } = useStore();
    const touch = useTouch();
    const [localEditing, setLocalEditing] = useState(false);
    const [hoveredId, setHoveredId] = useState(null);
    const [focusedId, setFocusedId] = useState(null);
    const editing = requestedEditing ?? localEditing;
    const setEditing = (next) => {
        if (requestedEditing === undefined)
            setLocalEditing(next);
        onEditingChange?.(next);
    };
    const on = canEdit && (alwaysEdit || editing);
    const [drag, setDrag] = useState(null);
    const dragRef = useRef(null);
    const press = useRef(null);
    const justDragged = useRef(false);
    const [menu, setMenu] = useState(null);
    const menuRef = useRef(null);
    const [msg, setMsg] = useState(null);
    const history = useRef([]);
    const [, bump] = useState(0);
    const [width, setWidth] = useState(1000);
    useEffect(() => {
        const el = wrap.current;
        if (!el)
            return;
        const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
        ro.observe(el);
        setWidth(el.clientWidth);
        return () => ro.disconnect();
    }, []);
    // Vertical only on a phone. On a computer the time line always runs left to right and the chart scrolls sideways if it is wide.
    const [phone, setPhone] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(max-width: 700px)").matches);
    useEffect(() => {
        const mq = window.matchMedia?.("(max-width: 700px)");
        if (!mq)
            return;
        const on2 = () => setPhone(mq.matches);
        mq.addEventListener("change", on2);
        return () => mq.removeEventListener("change", on2);
    }, []);
    const vertical = phone;
    const styles = useStatusStyles();
    const ev = state.events.find(e => e.id === eventId);
    const L = useMemo(() => metroLayout(state, sched, eventId, !vertical), [state, sched, eventId, vertical]);
    // Where each step sits in the chart (not its colour or status): when this changes because someone moved a step, the steps glide to
    // their new places and the lines dim while they do, so the dots and the lines never disagree about where things are (DX-22).
    // A window resize or the first draw changes pixel positions but not this, so those snap.
    const placeKey = useMemo(() => L.stations.map(s => `${s.key}:${s.col}`).join() + "|" + L.branches.map(b => `${b.id}:${b.row}:${b.nodes.map(x => `${x.node.id}@${x.col}`).join()}`).join(";"), [L]);
    const [restKey, setRestKey] = useState(placeKey);
    const settling = restKey !== placeKey && !prefersReducedMotion();
    useEffect(() => {
        if (restKey === placeKey)
            return;
        const t = setTimeout(() => setRestKey(placeKey), tokenMs("--spring-ui-dur", 450) + 60);
        return () => clearTimeout(t);
    }, [placeKey, restKey]);
    // Pixel geometry. Horizontal: columns run left → right, rows above/below. Vertical (phone): top → bottom, branches to the right.
    const COL = vertical ? 64 : Math.max(72, Math.min(96, (width - 80) / Math.max(1, L.cols)));
    const ROW = vertical ? 132 : 60;
    const PAD = vertical ? 28 : 56;
    // A card for the highest rule-bound step opens above its dot. Keep real headroom for it instead of clipping it at
    // the chart edge (the USG request is a common example).
    const top = vertical ? 40 : 150 + (-L.minRow) * ROW;
    const pos = (col, row) => vertical ? { x: 26 + row * ROW, y: top + col * COL } : { x: PAD + col * COL, y: top + row * ROW };
    const W = vertical ? Math.max(width, 26 + L.maxRow * ROW + 140) : PAD * 2 + L.cols * COL;
    const H = vertical ? top + L.cols * COL + 60 : top + L.maxRow * ROW + 130;
    const eventNodes = state.nodes.filter(n => n.eventId === eventId);
    const byId = new Map(eventNodes.map(n => [n.id, n]));
    const gaps = useMemo(() => flowGaps(L), [L]);
    const gapPoint = (g) => pos(g.col, g.row);
    const name = (id, empty) => (id ? `“${byId.get(id)?.title ?? "step"}”` : empty);
    // ---- Editing the flow right on the chart (president and vice president) ----
    const port = given ?? {
        snapshot: () => structuredClone(eventNodes),
        restore: snap => dispatch({ type: "restoreEventNodes", eventId, nodes: snap }),
        applyEdits: edits => dispatch({ type: "applyStepEdits", eventId, edits }),
        addStep: (id, uId, vId) => dispatch({ type: "addEventStep", eventId, id, uId, vId }),
        removeStep: id => dispatch({ type: "removeEventStep", eventId, nodeId: id }),
        newId: () => `${eventId}:s${nextCounter(state.nodes.map(n => n.id), new RegExp(`^${eventId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:s(\\d+)$`))}`,
    };
    const tpl = port.template;
    const snapshot = (label) => { history.current = [...history.current.slice(-9), { label, snap: port.snapshot() }]; bump(x => x + 1); };
    const say = (text, error = false) => setMsg({ text, error });
    const applyResult = (r, label) => {
        if (r.error)
            return say(r.error, true);
        if (!r.edits.length)
            return say(r.message);
        snapshot(label);
        port.applyEdits(r.edits);
        say(`${r.message}${r.note ? ` ${r.note}` : ""}`);
    };
    const moveTo = (id, g) => applyResult(moveBetween(eventNodes, id, g.uId, g.vId), `Move ${byId.get(id)?.title ?? "step"}`);
    const addAt = (uId, vId) => {
        const id = port.newId();
        snapshot("Add a step");
        port.addStep(id, uId, vId);
        say("Added a new step. Give it a name and an owner in the details panel.");
        setMenu(null);
        onSelect(id);
    };
    const removeStep = (id) => {
        const n = byId.get(id);
        if (!n || cannotDelete(n))
            return;
        snapshot(`Delete ${n.title}`);
        port.removeStep(id);
        say(`Deleted “${n.title}”. Steps that waited for it now wait for what it waited for.`);
        setMenu(null);
    };
    const undo = () => {
        const last = history.current.pop();
        if (!last)
            return;
        port.restore(last.snap);
        say(`Undone: ${last.label}`);
        bump(x => x + 1);
    };
    const local = (e) => { const r = canvasRef.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const nearest = (x, y, rId) => {
        let best = null, bd = Infinity;
        for (const g of gaps) {
            if (g.uId === rId || g.vId === rId)
                continue;
            const p = gapPoint(g), d = Math.hypot(p.x - x, p.y - y);
            if (d < bd) {
                bd = d;
                best = g;
            }
        }
        return bd <= SNAP ? best : null;
    };
    const setDragBoth = (d) => { dragRef.current = d; setDrag(d); };
    const onDown = (e, id) => {
        if (!on || e.button !== 0)
            return;
        press.current = { id, sx: e.clientX, sy: e.clientY, active: false };
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const onMove = (e) => {
        const p = press.current;
        if (!p)
            return;
        if (!p.active && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < 6)
            return;
        p.active = true;
        setMenu(null);
        const at = local(e);
        setDragBoth({ id: p.id, x: at.x, y: at.y, gap: nearest(at.x, at.y, p.id) });
        const w = wrap.current;
        if (w) {
            const r = w.getBoundingClientRect();
            if (e.clientX > r.right - 40)
                w.scrollLeft += 18;
            else if (e.clientX < r.left + 40)
                w.scrollLeft -= 18;
        }
    };
    const onUp = () => {
        const p = press.current;
        press.current = null;
        if (!p?.active)
            return;
        justDragged.current = true;
        const d = dragRef.current;
        setDragBoth(null);
        if (d?.gap)
            moveTo(p.id, d.gap);
        else
            say("Dropped away from the line, so nothing changed. Drop a step on a diamond between two steps.");
    };
    const onCancel = () => { press.current = null; setDragBoth(null); };
    /** Keyboard alternative to dragging: Alt + ← / → moves the step one place earlier or later on its line. */
    const shift = (id, dir) => {
        for (const t of flowTracks(L)) {
            const i = t.items.findIndex(x => x.node?.id === id && (t.id === "main" || x.row !== 0));
            if (i < 0)
                continue;
            const to = t.items[i + dir], beyond = t.items[i + 2 * dir];
            if (!to || !to.node)
                return say(dir > 0 ? "It is already the last step before the event day." : "It is already the first step.");
            const [a, b] = dir > 0 ? [to, beyond] : [beyond, to];
            return applyResult(moveBetween(eventNodes, id, a?.node?.id ?? null, b?.node?.id ?? null), `Move ${byId.get(id)?.title ?? "step"}`);
        }
    };
    const onKey = (e, id) => {
        if (!on)
            return;
        if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
            e.preventDefault();
            shift(id, e.key === "ArrowRight" ? 1 : -1);
        }
        if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
            e.preventDefault();
            const r = e.currentTarget.getBoundingClientRect();
            setMenu({ kind: "node", id, x: r.left, y: r.bottom + 8 });
        }
    };
    const openNode = (id, e) => { if (!on)
        return; setMenu({ kind: "node", id, x: e.clientX, y: e.clientY + 12 }); };
    const openGap = (g, e) => setMenu({ kind: "gap", gap: g, x: e.clientX, y: e.clientY + 12 });
    useEffect(() => {
        if (!menu)
            return;
        const dialog = menuRef.current;
        if (!dialog)
            return;
        const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialog.querySelector("button:not([disabled]), select")?.focus({ preventScroll: true });
        const restoreBackground = isolateDialog(dialog);
        const away = (e) => { if (!menuRef.current?.contains(e.target))
            setMenu(null); };
        const esc = (e) => {
            trapTabKey(e, dialog);
            if (e.key === "Escape" && !e.defaultPrevented) {
                e.preventDefault();
                e.stopPropagation();
                setMenu(null);
            }
        };
        document.addEventListener("pointerdown", away);
        document.addEventListener("keydown", esc);
        return () => {
            document.removeEventListener("pointerdown", away);
            document.removeEventListener("keydown", esc);
            restoreBackground();
            setTimeout(() => {
                if (opener?.isConnected && (document.activeElement === document.body || dialog.contains(document.activeElement)))
                    opener.focus();
            }, 0);
        };
    }, [menu]);
    useEffect(() => { history.current = []; setMenu(null); setMsg(null); }, [eventId]);
    useEffect(() => {
        const reset = () => {
            history.current = [];
            setMenu(null);
            setMsg(null);
            setDragBoth(null);
            bump(x => x + 1);
        };
        window.addEventListener("platypus:reset", reset);
        return () => window.removeEventListener("platypus:reset", reset);
    }, []);
    const stateOf = (n) => {
        if (tpl)
            return "todo";
        const issue = worstIssue(sched.nodes[n.id]?.issues);
        const late = n.status !== "done" && (sched.nodes[n.id]?.club ?? "9999") < state.today;
        return nodeStop(n, state.today, issue?.severity === "error" || late || forecast.nodes[n.id]?.color === "red" || n.status === "blocked");
    };
    const lastDoneMain = L.stations.reduce((k, s, i) => (s.node?.status === "done" ? i : k), -1);
    const mainPts = L.stations.map(s => pos(s.col, 0));
    // Start only fans out into the five routes. Do not paint a duplicate centre
    // rail underneath them; the visible main spine begins at Full Check.
    const visibleMainPts = mainPts.slice(1);
    const mainPath = visibleMainPts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
    const donePath = lastDoneMain > 1 ? mainPts.slice(1, lastDoneMain + 1).map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ") : "";
    const branchPath = (from, to, row) => {
        const a = pos(L.stations[from].col, 0), b = pos(L.stations[to].col, 0), ra = pos(L.stations[from].col, row), rb = pos(L.stations[to].col, row);
        if (vertical) {
            const ya = a.y + 30, yb = b.y - 30;
            return `M${a.x} ${a.y} C${a.x} ${a.y + 20} ${ra.x} ${ya - 20} ${ra.x} ${ya} L${rb.x} ${yb} C${rb.x} ${yb + 20} ${b.x} ${b.y - 20} ${b.x} ${b.y}`;
        }
        const xa = a.x + 34, xb = b.x - 34;
        return `M${a.x} ${a.y} C${a.x + 22} ${a.y} ${xa - 22} ${ra.y} ${xa} ${ra.y} L${xb} ${rb.y} C${xb + 22} ${rb.y} ${b.x - 22} ${b.y} ${b.x} ${b.y}`;
    };
    /** A hit target follows the exact painted rail segment, so its mint feedback overlays the grey line. */
    const gapPath = (g) => {
        if (g.track === "main") {
            const a = pos(g.u.col, 0), b = pos(g.v.col, 0);
            return `M${a.x} ${a.y}L${b.x} ${b.y}`;
        }
        const branch = L.branches.find(b => b.id === g.track);
        const a = pos(L.stations[branch.from].col, 0), b = pos(L.stations[branch.to].col, 0);
        const points = branch.nodes.map(x => pos(x.col, branch.row));
        const at = points.findIndex(p => p.x === pos(g.u.col, g.u.row).x && p.y === pos(g.u.col, g.u.row).y);
        const next = points.findIndex(p => p.x === pos(g.v.col, g.v.row).x && p.y === pos(g.v.col, g.v.row).y);
        if (vertical) {
            const ra = pos(L.stations[branch.from].col, branch.row), rb = pos(L.stations[branch.to].col, branch.row), ya = a.y + 30, yb = b.y - 30;
            if (at === -1)
                return `M${a.x} ${a.y} C${a.x} ${a.y + 20} ${ra.x} ${ya - 20} ${ra.x} ${ya} L${ra.x} ${points[0].y}`;
            if (next === -1)
                return `M${points.at(-1).x} ${points.at(-1).y} L${rb.x} ${yb} C${rb.x} ${yb + 20} ${b.x} ${b.y - 20} ${b.x} ${b.y}`;
            return `M${points[at].x} ${points[at].y}L${points[next].x} ${points[next].y}`;
        }
        const ra = pos(L.stations[branch.from].col, branch.row), rb = pos(L.stations[branch.to].col, branch.row), xa = a.x + 34, xb = b.x - 34;
        if (at === -1)
            return `M${a.x} ${a.y} C${a.x + 22} ${a.y} ${xa - 22} ${ra.y} ${xa} ${ra.y} L${points[0].x} ${ra.y}`;
        if (next === -1)
            return `M${points.at(-1).x} ${points.at(-1).y} L${xb} ${rb.y} C${xb + 22} ${rb.y} ${b.x - 22} ${b.y} ${b.x} ${b.y}`;
        return `M${points[at].x} ${points[at].y}L${points[next].x} ${points[next].y}`;
    };
    const evStation = L.stations.find(s => s.key === EVENT_KEY);
    const dot = (n, col, row, labelSide) => {
        const p = pos(col, row);
        const st = stateOf(n);
        const plan = sched.nodes[n.id];
        const issue = tpl ? undefined : worstIssue(plan?.issues); // a workflow has no dates, so the dates' problems are not its problems
        const owner = state.people.find(x => x.id === n.ownerId)?.name;
        const mark = tpl?.marks?.[n.id];
        const label = tpl ? tpl.lines(n).join(". ") + "." : `${n.title}. ${styles[n.status].label}. Owner ${owner ?? "none"}. Club deadline ${plan ? fmtShort(plan.club) : "pending"}${plan?.official ? `, ASU deadline ${fmtShort(plan.official)}` : ""}.${issue ? ` ${issue.text}` : ""}`;
        const kind = SITUATION_KEYS.has(n.stepKey ?? "") ? "situation" : "baseline";
        const showCard = hoveredId === n.id || focusedId === n.id;
        const cardId = `flow-card-${n.id}`;
        return _jsxs("div", { className: `m-node ${labelSide} ${n.id === selectedId ? "is-selected" : ""}${drag?.id === n.id ? " is-dragging" : ""}`, style: { "--x": `${p.x}px`, "--y": `${p.y}px` }, onPointerEnter: e => { if (e.pointerType !== "touch")
                setHoveredId(n.id); }, onPointerLeave: () => setHoveredId(null), onFocus: () => setFocusedId(n.id), onBlur: e => { if (!e.currentTarget.contains(e.relatedTarget))
                setFocusedId(null); }, children: [_jsx("button", { type: "button", className: `m-dot ${kind} ${st} ${issue ? `has-${issue.severity}` : ""}${mark ? ` mark-${mark}` : ""}`, onClick: e => { if (justDragged.current) {
                        justDragged.current = false;
                        return;
                    } if (on && touch && e.detail > 0)
                        openNode(n.id, e);
                    else
                        onSelect(n.id); }, "aria-label": `${label}. ${kind === "baseline" ? "Core event step." : "Situation-based step."}${on ? " Drag to move it, double-click for more, or press Alt and an arrow key to move it." : ""}`, "data-testid": `flow-node-${n.stepKey ?? n.id}`, "aria-describedby": showCard ? cardId : undefined, onPointerDown: e => onDown(e, n.id), onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onCancel, onDoubleClick: e => openNode(n.id, e), onContextMenu: e => { if (on) {
                        e.preventDefault();
                        openNode(n.id, e);
                    } }, onKeyDown: e => onKey(e, n.id) }), _jsxs("span", { className: "m-label", "aria-hidden": "true", children: [_jsx("b", { children: shortTitle(n) }), _jsx("span", { children: tpl ? tpl.sublabel(n) : firstName(state, n.ownerId) })] }), showCard && _jsxs("span", { id: cardId, className: "m-card", role: "tooltip", children: [_jsx("b", { children: n.title }), tpl ? tpl.lines(n).slice(1).map((t, i) => _jsx("span", { children: t }, i)) : _jsxs(_Fragment, { children: [_jsxs("span", { children: [owner ?? "No owner", " \u00B7 ", styles[n.status].label, plan ? ` · due ${fmtShort(plan.club)}` : ""] }), plan?.official ? _jsxs("span", { children: ["ASU deadline ", fmtShort(plan.official), n.ruleIds[0] ? ` (${n.ruleIds[0]})` : ""] }) : null, issue ? _jsx("span", { className: "m-card-warn", children: issue.text }) : n.waitingOn ? _jsxs("span", { children: ["Waiting on: ", n.waitingOn] }) : null] })] })] }, n.id);
    };
    // Open every activity at its beginning so the always-active Start station is visible.
    useEffect(() => {
        const el = wrap.current;
        if (!el || vertical || W <= el.clientWidth)
            return;
        el.scrollLeft = 0;
    }, [eventId, vertical, L.cols]);
    return _jsxs(_Fragment, { children: [canEdit && _jsxs("div", { className: "m-edit-bar", children: [!alwaysEdit && requestedEditing === undefined && _jsx("button", { type: "button", className: "btn small", "aria-pressed": editing, onClick: () => { setEditing(!editing); setMenu(null); setDragBoth(null); }, "data-testid": "flow-edit-toggle", children: editing ? "Done editing" : "Edit flow" }), on && _jsxs("button", { type: "button", className: "btn small", onClick: undo, disabled: !history.current.length, "data-testid": "flow-undo", children: ["Undo", history.current.length ? `: ${history.current[history.current.length - 1].label}` : ""] }), on && _jsx("span", { className: "small muted", children: touch ? "Tap a step for add, delete and details · Drag it onto a ◆ to move it · Double-tap a line to cut or add a link" : "Drag a step onto a ◆ between two steps · Double-click a step to add or delete · Double-click a line to cut or add a link" }), _jsx("span", { role: "status", "aria-live": "polite", className: `small ${msg?.error ? "late-text" : ""}`, "data-testid": "flow-edit-msg", children: on ? msg?.text : "" })] }), _jsxs("div", { className: `metro ${vertical ? "vertical" : ""}${on ? " editing" : ""}${drag ? " dragging" : ""}${settling ? " is-settling" : ""}`, ref: wrap, "data-testid": "flow-chart", style: { "--label-w": `${vertical ? 140 : COL - 8}px` }, children: [_jsxs("div", { className: "metro-canvas", ref: canvasRef, style: { width: W, height: H }, children: [_jsxs("svg", { width: W, height: H, "aria-hidden": "true", children: [!vertical && !tpl && _jsx("text", { x: pos(evStation.col, 0).x, y: 18, className: "m-tick strong", textAnchor: "middle", children: fmtShort(ev.date) }), L.branches.map(b => _jsx("path", { d: branchPath(b.from, b.to, b.row), className: `m-line branch ${b.nodes.every(x => x.node.status === "done") ? "done" : ""}` }, b.id)), _jsx("path", { d: mainPath, className: "m-line main" }), donePath && _jsx("path", { d: donePath, className: "m-line main done" }), on && gaps.map(g => { const d = gapPath(g); return _jsxs("g", { children: [_jsx("path", { d: d, className: `m-hit ${g.track === "main" ? "m-hit-main" : ""}`, "data-testid": `flow-line-${g.u.key}-${g.v.key}`, onDoubleClick: e => openGap(g, e) }), _jsx("path", { d: d, className: "m-hit-line" })] }, g.id); })] }), L.stations.map(s => s.node ? dot(s.node, s.col, 0, vertical ? "right" : "below") : null), L.branches.flatMap(b => b.nodes.map(x => dot(x.node, x.col, b.row, vertical ? "right" : b.row < 0 ? "above" : "below"))), L.stations.filter(s => s.key === EVENT_KEY || s.key === START_KEY || s.key === END_KEY).map(s => {
                                const p = pos(s.col, 0);
                                return _jsxs("div", { className: `m-node ${vertical ? "right" : "below"} m-${s.key.replaceAll("_", "")}`, style: { "--x": `${p.x}px`, "--y": `${p.y}px` }, children: [_jsx("span", { className: `m-dot station ${s.key === START_KEY ? "done" : s.key === EVENT_KEY ? (ev.date < state.today ? "done" : "event") : "todo"}` }), _jsxs("span", { className: "m-label", children: [_jsx("b", { children: s.key === EVENT_KEY ? "Event day" : s.key === START_KEY ? "Start" : "Done" }), s.key === EVENT_KEY && vertical && !tpl ? _jsx("span", { children: fmtShort(ev.date) }) : null] })] }, s.key);
                            }), on && drag && _jsxs(_Fragment, { children: [gaps.filter(g => g.uId !== drag.id && g.vId !== drag.id).map(g => { const p = gapPoint(g); return _jsx("span", { className: `m-gap${drag.gap?.id === g.id ? " is-near" : ""}`, style: { left: p.x, top: p.y }, "aria-hidden": "true" }, g.id); }), _jsxs("span", { className: "m-ghost", style: { left: drag.x, top: drag.y }, "aria-hidden": "true", children: [_jsx("b", { children: byId.get(drag.id)?.title }), drag.gap && _jsxs("i", { children: ["Between ", name(drag.gap.uId, "the start"), " and ", name(drag.gap.vId, "the event day")] })] })] }), on && menu && (() => {
                                const left = Math.max(8, Math.min(menu.x, window.innerWidth - 256)), top = Math.max(8, Math.min(menu.y, window.innerHeight - 380));
                                if (menu.kind === "node") {
                                    const n = byId.get(menu.id);
                                    if (!n)
                                        return null;
                                    const track = flowTracks(L).map(t => ({ t, i: t.items.findIndex(x => x.node?.id === n.id && (t.id === "main" || x.row !== 0)) })).find(x => x.i >= 0);
                                    const prev = track?.t.items[track.i - 1], next = track?.t.items[track.i + 1];
                                    const block = cannotDelete(n);
                                    const upstream = n.dependsOn.map(d => byId.get(d)).filter((x) => !!x);
                                    return _jsxs("div", { className: "m-menu", ref: menuRef, role: "dialog", "aria-modal": "true", "aria-label": `Actions for ${n.title}`, style: { left, top }, "data-testid": "flow-menu", children: [_jsx("b", { children: n.title }), touch && _jsx("button", { type: "button", className: "btn small", onClick: () => {
                                                    const trigger = canvasRef.current?.querySelector(`[data-testid="flow-node-${CSS.escape(n.stepKey ?? n.id)}"]`);
                                                    setMenu(null);
                                                    // Let the modal release its inert background before opening the rail, so it can remember the step.
                                                    setTimeout(() => { trigger?.focus(); onSelect(n.id); }, 0);
                                                }, children: "Open details" }), _jsx("button", { type: "button", className: "btn small", onClick: () => addAt(n.id, next && next.key !== EVENT_KEY && next.key !== END_KEY ? next.node?.id ?? null : null), children: "Add a step after this one" }), _jsx("button", { type: "button", className: "btn small", disabled: !prev || prev.key === EVENT_KEY, onClick: () => addAt(prev?.node?.id ?? null, n.id), children: "Add a step before this one" }), _jsx("button", { type: "button", className: "btn small", disabled: !!block, onClick: () => removeStep(n.id), "aria-describedby": block ? "m-menu-why" : undefined, children: "Delete this step" }), block && _jsxs("span", { id: "m-menu-why", className: "small muted", children: ["Cannot delete: ", block] }), upstream.length > 0 && _jsxs("label", { className: "small", children: ["Stop waiting for\u2026", _jsxs("select", { "aria-label": `Stop ${n.title} waiting for`, value: "", onChange: e => { if (e.target.value) {
                                                            applyResult(unlinkSteps(eventNodes, n.id, e.target.value), "Cut a link");
                                                            setMenu(null);
                                                        } }, children: [_jsx("option", { value: "", children: "Choose a step" }), upstream.map(u => _jsx("option", { value: u.id, children: u.title }, u.id))] })] }), _jsx("button", { type: "button", className: "btn btn-quiet small", onClick: () => setMenu(null), children: "Close" })] });
                                }
                                const g = menu.gap, u = g.uId ? byId.get(g.uId) : undefined, v = g.vId ? byId.get(g.vId) : undefined;
                                const direct = !!(u && v && v.dependsOn.includes(u.id)), indirect = !!(u && v && !direct && ancestorsOf(eventNodes, v.id).has(u.id));
                                return _jsxs("div", { className: "m-menu", ref: menuRef, role: "dialog", "aria-modal": "true", "aria-label": "Actions for this line", style: { left, top }, "data-testid": "flow-menu", children: [_jsxs("b", { children: [u ? `After “${u.title}”` : "From the start", v ? `, before “${v.title}”` : ", before the event day"] }), u && v && direct && _jsxs("button", { type: "button", className: "btn small", onClick: () => { applyResult(unlinkSteps(eventNodes, v.id, u.id), "Cut a link"); setMenu(null); }, children: ["Remove the link: \u201C", v.title, "\u201D stops waiting"] }), u && v && !direct && !indirect && _jsxs(_Fragment, { children: [_jsx("span", { className: "small muted", children: "These two steps are not linked: the line only shows their order." }), _jsxs("button", { type: "button", className: "btn small", onClick: () => { applyResult(doAfter(eventNodes, v.id, u.id), "Add a link"); setMenu(null); }, children: ["Make \u201C", v.title, "\u201D wait for \u201C", u.title, "\u201D"] })] }), u && v && indirect && _jsxs("span", { className: "small muted", children: ["\u201C", v.title, "\u201D waits for \u201C", u.title, "\u201D through other steps. Cut a link on that path to separate them."] }), !(u && v) && _jsx("span", { className: "small muted", children: "This line has no link to cut. It leads to the start or the event day." }), _jsx("button", { type: "button", className: "btn small", onClick: () => addAt(g.uId, g.vId), children: "Add a step here" }), _jsx("button", { type: "button", className: "btn btn-quiet small", onClick: () => setMenu(null), children: "Close" })] });
                            })()] }), tpl ? _jsxs("div", { className: "m-legend small", "aria-label": "Legend", children: [_jsxs("span", { children: [_jsx("i", { className: "m-dot baseline todo" }), "Core event step"] }), _jsxs("span", { children: [_jsx("i", { className: "m-dot situation todo" }), "Situation-based step"] })] }) : _jsxs("div", { className: "m-legend small", "aria-label": "Legend", children: [_jsxs("span", { children: [_jsx("i", { className: "m-dot done" }), "Done"] }), _jsxs("span", { children: [_jsx("i", { className: "m-dot now" }), "In progress"] }), _jsxs("span", { children: [_jsx("i", { className: "m-dot todo" }), "Not started"] }), _jsxs("span", { children: [_jsx("i", { className: "m-dot risk" }), "At risk"] })] })] })] });
}
