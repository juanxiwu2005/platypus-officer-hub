import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { fmtShort } from "../../../lib/dates";
import { onboardingCopy } from "../../copy";
/**
 * The witness chain: connected dots, a step name and a rule-engine date under each (the same look as the Chain in the product). When `drawing`
 * is set the dots appear one after another and each line grows from the left (src/styles/ob-06-first-event.css); the parent remounts this
 * list with a new key to play it again, so a second press restarts it at once instead of queueing. Without `drawing` it is simply there.
 */
export function EventChain({ dots, today, drawing, stale, onDrawn }) {
    const last = dots.length - 1;
    const done = (e) => { if (e.animationName === "ob6-dot-in" && e.currentTarget.dataset.last === "true")
        onDrawn(); };
    return _jsx("div", { className: "ob6-scroll", role: "region", "aria-label": onboardingCopy.founder.firstEvent.chainLabel, tabIndex: 0, children: _jsx("ol", { className: `ob6-chain${drawing ? " is-drawing" : ""}${stale ? " is-stale" : ""}`, "data-testid": "first-event-chain", children: dots.map((d, i) => _jsxs("li", { className: `ob6-node${d.date < today ? " is-past" : ""}`, style: { "--i": i }, "data-last": i === last, onAnimationEnd: done, children: [_jsx("span", { className: "ob6-dot", "aria-hidden": "true" }), _jsx("span", { className: "ob6-name", children: d.title }), _jsx("time", { className: "ob6-date", dateTime: d.date, children: fmtShort(d.date) })] }, d.id)) }) });
}
