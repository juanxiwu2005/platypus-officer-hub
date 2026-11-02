import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { onboardingCopy } from "../copy";
/** The product's own chain of connected dots, used as progress: the line to a finished step grows in, skipped steps are hollow and dashed. */
export function ProgressChain({ steps, index, skipped }) {
    return _jsx("ol", { className: "ob-chain", "aria-label": onboardingCopy.progress, children: steps.map((s, i) => {
            const state = i === index ? "now" : skipped.includes(s.id) ? "skipped" : i < index ? "done" : "todo";
            return _jsxs("li", { className: `ob-dot is-${state}`, "aria-current": i === index ? "step" : undefined, children: [_jsx("span", { className: "ob-dot-mark", "aria-hidden": "true" }), _jsxs("span", { className: "sr-only", children: [s.label, state === "skipped" ? ", skipped" : state === "done" ? ", done" : "", s.optional && state === "todo" ? ", optional" : ""] })] }, s.id);
        }) });
}
