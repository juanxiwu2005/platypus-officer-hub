import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useStore, useViewer } from "../data/store";
import { PageHead } from "../components/Page";
import { useRail } from "../components/rail/RailContext";
import { fmtShort, daysBetween } from "../lib/dates";
import { PLAN_B } from "../engine/playbooks";
import { fundingDecisionDate } from "../engine/schedule";
import { checkPreflight, EMPTY_PACKAGE } from "../lib/preflight";
import { callApi } from "../lib/api";
import { Chain, Empty, Info } from "../components/ui";
import { Bts, BtsTr } from "../components/Bts";
export const FUNDING_STAGES = ["Budget request", "Budget approved", "Purchase request", "Purchase approved", "Ordered or reimbursed", "Attendance submitted"];
export const STAGE_IDS = ["budget_request", "budget_approved", "purchase_request", "purchase_approved", "ordered_or_reimbursed", "attendance_submitted"];
const HEAD = [["Budget", "request"], ["Budget", "approved"], ["Purchase", "request"], ["Purchase", "approved"], ["Paid or", "reimbursed"], ["Attendance", "submitted"]];
const useEditable = () => {
    const { state } = useStore();
    const { canNudge, role } = useViewer();
    return canNudge || (role?.fn === "finance" && role.holderId === state.viewerId);
};
/** Each event's money as one parcel-tracking row (v1.1): six stops, colour shows where it is. */
export default function FundingPage() {
    const { state, dispatch } = useStore();
    const rail = useRail();
    const editable = useEditable();
    const [filter, setFilter] = useState("all");
    const events = state.events.filter(e => e.funding !== "none");
    const rows = events.map(e => {
        const f = state.funding.find(x => x.eventId === e.id);
        const at = f ? STAGE_IDS.indexOf(f.stage) : -1;
        const decision = fundingDecisionDate(state, e.id);
        const late = !!f && !!decision && state.today >= decision && at < 1;
        const spendRisk = !!f && !!f.spendBy && daysBetween(state.today, f.spendBy) <= 14 && (f.amount - (f.spent ?? 0)) > 0 && at >= 1;
        return { e, f, at, decision, late: late || spendRisk, action: !f || late || spendRisk || at < 5 };
    }).filter(r => filter === "all" || r.action);
    const total = (k, approvedOnly = false) => state.funding.filter(f => !approvedOnly || STAGE_IDS.indexOf(f.stage) >= 1).reduce((s, f) => s + (k === "amount" ? f.amount : f.spent ?? 0), 0);
    return _jsxs(_Fragment, { children: [_jsx(PageHead, { path: "/funding", actions: _jsxs("div", { className: "seg", role: "group", "aria-label": "Filter", children: [_jsx("button", { type: "button", "aria-pressed": filter === "all", onClick: () => setFilter("all"), children: "All" }), _jsx("button", { type: "button", "aria-pressed": filter === "action", onClick: () => setFilter("action"), children: "Needs action" })] }) }), _jsx("section", { className: "card", children: _jsxs("div", { className: "stat-row", children: [_jsxs("div", { children: [_jsxs("b", { className: "num", children: ["$", total("amount").toLocaleString()] }), _jsx("span", { children: "Requested" })] }), _jsxs("div", { children: [_jsxs("b", { className: "num", children: ["$", total("amount", true).toLocaleString()] }), _jsx("span", { children: "Approved" })] }), _jsxs("div", { children: [_jsxs("b", { className: "num", children: ["$", total("spent").toLocaleString()] }), _jsx("span", { children: "Spent" })] }), _jsx("span", { className: "spacer" }), _jsx(Info, { children: "USG needs food and service requests 10 business days ahead (R09) and speaker requests 14 business days ahead with a signed SAP (R10). From experience, allow 6\u20138 weeks end to end; that is not official guidance." })] }) }), _jsxs("section", { className: "card tbl-wrap", "data-testid": "funding-table", children: [_jsxs("table", { className: "tbl funding-tbl", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Event" }), _jsx("th", { children: "Date" }), _jsx("th", { className: "num", children: "Budget" }), HEAD.map(([a, b]) => _jsxs("th", { className: "stage-h", children: [_jsx("span", { children: a }), _jsx("span", { children: b })] }, a + b)), _jsx("th", { children: "Next" })] }) }), _jsx("tbody", { children: rows.map(({ e, f, at, decision, late }) => {
                                    const stops = STAGE_IDS.map((id, i) => ({ key: id, state: !f ? "todo" : i < at ? "done" : i === at ? (late ? "risk" : "now") : "todo", hint: _jsxs(_Fragment, { children: [_jsx("b", { children: FUNDING_STAGES[i] }), _jsx("span", { className: "hc-line", children: !f ? "Not started" : i < at ? "Done" : i === at ? `Current${decision ? ` · decide by ${fmtShort(decision)}` : ""}` : "Later" })] }) }));
                                    const holder = state.people.find(p => p.id === state.roles.find(r => r.fn === "finance")?.holderId)?.name.split(" ")[0];
                                    return [_jsxs("tr", { className: "clickable", onClick: () => f && rail.show({ kind: "funding", eventId: e.id }), children: [_jsx("td", { children: _jsx("button", { type: "button", className: "row-btn", onClick: ev => { ev.stopPropagation(); if (f)
                                                            rail.show({ kind: "funding", eventId: e.id }); }, children: e.name }) }), _jsx("td", { className: "small num", children: fmtShort(e.date) }), _jsx("td", { className: "num", children: f ? `$${f.amount.toLocaleString()}` : "—" }), _jsx("td", { colSpan: 6, className: "chain-cell", "data-testid": "funding-stages", children: _jsx(Chain, { label: `${e.name} funding`, stops: stops, showLabels: false, compact: true }) }), _jsx("td", { className: `small ${late ? "late-text" : ""}`, children: !f
                                                        ? (editable ? _jsx("button", { type: "button", className: "btn small", onClick: ev => { ev.stopPropagation(); dispatch({ type: "startFunding", eventId: e.id }); }, children: "Start" }) : "Not started")
                                                        : at === 5 ? "Closed" : `${holder ?? "Finance"}${decision && at < 1 ? ` · ${fmtShort(decision)}` : ""}` })] }, e.id), _jsxs(BtsTr, { cols: 10, children: [_jsxs(Bts, { label: "Data", children: ["The six dots are the funding stages in order (", FUNDING_STAGES.join(" → "), "). The stage is the one saved on this event's funding record."] }), _jsx(Bts, { label: "Rule engine", children: decision ? `Decide by ${fmtShort(decision)}: the earliest ASU deadline among the event's USG request steps. The dot turns red if that date has come and the request has not been approved, or if money is left to spend within 14 days of the spend-by date.` : "No USG request step sets a decide-by date for this event." })] }, `${e.id}-bts`)];
                                }) })] }), !rows.length && _jsx(Empty, { children: "Nothing needs action." })] })] });
}
/** Details for one event's funding, shown in the right rail. */
export function FundingDetail({ eventId }) {
    const { state } = useStore();
    const f = state.funding.find(x => x.eventId === eventId);
    return f ? _jsx(FundingCard, { funding: f }, eventId) : _jsx(Empty, { children: "No funding request yet." });
}
function FundingCard({ funding: f }) {
    const { state, dispatch } = useStore();
    const editable = useEditable();
    const e = state.events.find(e => e.id === f.eventId);
    const at = STAGE_IDS.indexOf(f.stage);
    const [pack, setPack] = useState(() => ({ ...EMPTY_PACKAGE, amount: f.amount, attendees: e.headcount, ...f.application }));
    const [result, setResult] = useState(null), [label, setLabel] = useState("");
    const decision = fundingDecisionDate(state, e.id), remaining = Math.max(0, f.amount - (f.spent ?? 0));
    const lateSpend = f.spendBy && daysBetween(state.today, f.spendBy) <= 14 && remaining > 0 && at >= 1;
    const patch = (key, value) => setPack({ ...pack, [key]: value });
    async function check() { dispatch({ type: "fundingPackage", eventId: e.id, application: pack }); try {
        await callApi("/preflight", pack);
        setLabel("Checked by the server and the rule book.");
    }
    catch {
        setLabel("Checked locally against R11 and R12.");
    } setResult(checkPreflight(pack)); }
    return _jsxs("section", { className: "form-stack funding-detail", "aria-label": `Funding for ${e.name}`, children: [_jsx("h2", { children: e.name }), _jsxs("p", { className: "small muted", children: [f.source.toUpperCase(), " \u00B7 $", f.amount.toLocaleString()] }), _jsx(Chain, { label: `${e.name} funding stages`, stops: FUNDING_STAGES.map((s, i) => ({ key: s, label: s, state: i < at ? "done" : i === at ? "now" : "todo", hint: _jsxs(_Fragment, { children: [_jsx("b", { children: s }), _jsx("span", { className: "hc-line", children: i < at ? "Done" : i === at ? "Current" : "Later" })] }) })) }), _jsx("button", { className: "btn btn-primary", disabled: !editable || at === 5, onClick: () => dispatch({ type: "advanceFunding", eventId: e.id }), children: "Confirm current step complete" }), _jsxs("div", { className: "kv", children: [_jsx("label", { htmlFor: "f-amt", children: "Allocated amount ($)" }), _jsx("input", { id: "f-amt", type: "number", min: "0", value: f.amount, disabled: !editable, onChange: x => dispatch({ type: "fundingAmount", eventId: e.id, amount: Number(x.target.value) }) }), _jsx("label", { htmlFor: "f-spent", children: "Spent so far ($)" }), _jsx("input", { id: "f-spent", type: "number", min: "0", max: f.amount, value: f.spent ?? 0, disabled: !editable, onChange: x => dispatch({ type: "fundingSpend", eventId: e.id, spent: Number(x.target.value) }) }), _jsx("label", { htmlFor: "f-by", children: "Spend-by date \u00B7 confirmed by you" }), _jsx("input", { id: "f-by", type: "date", value: f.spendBy ?? "", disabled: !editable, onChange: x => dispatch({ type: "fundingSpendBy", eventId: e.id, date: x.target.value }) })] }), _jsx("progress", { value: f.spent ?? 0, max: f.amount || 1, "aria-label": "Funding used" }), _jsxs("p", { className: "small", children: ["$", remaining.toLocaleString(), " left", f.spendBy ? ` · spend by ${fmtShort(f.spendBy)}` : "", decision ? ` · Plan B decision ${fmtShort(decision)}` : ""] }), lateSpend && _jsxs("p", { role: "status", className: "warn-text small", children: [f.spendBy < state.today ? "Spend-by date has passed" : "Spend-by date is within 14 days", " with money unspent. Check with the funding office."] }), decision && state.today >= decision && at < 1 && _jsxs("aside", { className: "plan-b", children: [_jsx("h3", { children: "Funding is still unapproved \u00B7 review Plan B" }), PLAN_B.map(b => _jsxs("p", { children: [_jsx("b", { children: b.label }), " \u00B7 ", b.when] }, b.id)), _jsx("p", { className: "small muted", children: "Choose with the president; nothing changes automatically." })] }), _jsxs("details", { className: "more", children: [_jsx("summary", { children: "Pre-submission check \u00B7 R11 / R12" }), _jsxs("fieldset", { disabled: !editable, className: "form-stack", children: [_jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: pack.flyer, onChange: x => patch("flyer", x.target.checked) }), " Event flyer attached"] }), _jsxs("label", { children: ["Public purpose", _jsx("input", { value: pack.publicPurpose, onChange: x => patch("publicPurpose", x.target.value) })] }), _jsxs("label", { children: ["Invoice addressed to", _jsx("input", { value: pack.invoiceTo, onChange: x => patch("invoiceTo", x.target.value) })] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: pack.reimbursement, onChange: x => patch("reimbursement", x.target.checked) }), " Reimbursement request"] }), _jsxs("label", { children: ["Request amount ($)", _jsx("input", { type: "number", min: "0", value: pack.amount, onChange: x => patch("amount", Number(x.target.value)) })] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: pack.amazon, onChange: x => patch("amazon", x.target.checked) }), " Amazon purchase"] }), _jsxs("label", { children: ["Total meal cost ($)", _jsx("input", { type: "number", min: "0", value: pack.mealCost, onChange: x => patch("mealCost", Number(x.target.value)) })] }), _jsxs("label", { children: ["Meal attendees (estimate only)", _jsx("input", { type: "number", min: "0", step: "1", value: pack.attendees, onChange: x => patch("attendees", Number(x.target.value)) })] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: pack.businessMealsForm, onChange: x => patch("businessMealsForm", x.target.checked) }), " Business Meals Form attached"] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: pack.attendanceList, onChange: x => patch("attendanceList", x.target.checked) }), " Attendance list attached"] }), _jsx("p", { className: "small muted", children: "Record only whether a list is attached; never upload names." }), _jsx("button", { type: "button", className: "btn", onClick: check, children: "Check before submitting" })] }), result && _jsxs("div", { "data-testid": "preflight-result", children: [_jsx("p", { className: "small muted", children: label }), _jsx("b", { children: result.ready ? "Checklist complete · office review still required" : "Resolve these items before submitting" }), result.issues.map(i => _jsxs("p", { children: [_jsxs("a", { href: result.rules.find(r => r.id === i.ruleId).sources[0].url, target: "_blank", rel: "noreferrer", children: ["[", i.ruleId, "]"] }), " ", i.text] }, i.field))] })] })] });
}
