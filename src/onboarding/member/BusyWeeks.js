import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { fmtShort } from "../../lib/dates";
import { onboardingCopy } from "../copy";
import { useFlow } from "../engine/useFlow";
import { MAX_BUSY_WEEKS, readExtra, writeExtra } from "./finish/extra";
import { monthName, weeksFrom } from "./finish/weeks";
import { fill } from "./invitation/choice";
import { StepFooter } from "./invitation/StepFooter";
import { usePreview } from "./invitation/usePreview";
const c = onboardingCopy.member.busyWeeks;
const KIND_TEXT = { finals: c.finals, break: c.brk, between: c.between, holiday: c.holiday };
/** Member screen 3 (can be skipped): a strip of the coming weeks. Tap the ones that are busy. Finals, breaks and holidays are already marked. */
export function BusyWeeks() {
    const preview = usePreview();
    if (!preview.person)
        return null;
    return _jsx(BusyForm, { preview: preview, person: preview.person }, preview.person.id);
}
function BusyForm({ preview, person }) {
    const flow = useFlow();
    const [busy, setBusy] = useState(() => readExtra(person.id)?.busyWeeks ?? person.busyWeeks);
    const weeks = useMemo(() => weeksFrom(preview.state.today), [preview.state.today]);
    const months = useMemo(() => {
        const groups = [];
        for (const w of weeks) {
            const name = monthName(w.monday), last = groups[groups.length - 1];
            if (last?.name === name)
                last.weeks.push(w);
            else
                groups.push({ name, weeks: [w] });
        }
        return groups;
    }, [weeks]);
    const full = busy.length >= MAX_BUSY_WEEKS;
    const toggle = (monday) => {
        const next = busy.includes(monday) ? busy.filter(d => d !== monday) : full ? busy : [...busy, monday].sort();
        setBusy(next);
        writeExtra(person.id, { busyWeeks: next });
    };
    const label = (w, on) => [fill(c.weekOf, { date: fmtShort(w.monday) }), w.kind ? `${KIND_TEXT[w.kind]}, ${c.autoAvoided}` : null, on ? c.busy : null].filter(Boolean).join(", ");
    return _jsxs("div", { className: "ob-m-page", children: [_jsxs("section", { className: "ob-card ob-m-card", children: [_jsx("h1", { id: "ob-m-weeks-title", children: c.title }), _jsx("p", { className: "muted", children: c.effect }), _jsx("div", { className: "ob-m-weeks", role: "group", "aria-label": c.group, "data-testid": "week-strip", children: months.map(m => _jsxs("div", { className: "ob-m-month", children: [_jsx("span", { className: "ob-m-month-name", "aria-hidden": "true", children: m.name }), _jsx("div", { className: "ob-m-cells", children: m.weeks.map(w => {
                                        const on = busy.includes(w.monday);
                                        return _jsx("button", { type: "button", className: `ob-m-week${w.kind ? ` is-${w.kind}` : ""}`, "aria-pressed": on, "aria-label": label(w, on), title: fill(c.weekOf, { date: fmtShort(w.monday) }), "data-week": w.monday, "data-kind": w.kind ?? "plain", disabled: full && !on, onClick: () => toggle(w.monday), children: _jsx("span", { "aria-hidden": "true", children: on ? "✓" : "" }) }, w.monday);
                                    }) })] }, m.weeks[0].monday)) }), _jsx("p", { className: "small muted ob-m-legend", children: c.legend }), _jsxs("p", { className: "small muted", "aria-live": "polite", "data-testid": "week-count", children: [busy.length ? fill(c.count, { n: String(busy.length) }) : "", full ? ` ${c.limit}` : ""] }), _jsx("p", { children: _jsx("button", { type: "button", className: "btn", onClick: () => { writeExtra(person.id, { busyWeeks: undefined }); flow?.skip(); }, children: c.skip }) })] }), _jsx(StepFooter, { onBack: () => { flow?.back(); }, onNext: () => { writeExtra(person.id, { busyWeeks: busy }); flow?.next(); } })] });
}
