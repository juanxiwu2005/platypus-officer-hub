import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { onboardingCopy } from "../../copy";
/** The bottom bar: Back on the left, the main button on the right (full width on a phone). It floats over the content and stays in reach. */
export function StepFooter({ onBack, onNext, label = onboardingCopy.next }) {
    return _jsx("div", { className: "ob-m-foot", children: _jsxs("div", { className: "ob-m-foot-in", children: [onBack && _jsx("button", { type: "button", className: "btn", onClick: onBack, children: onboardingCopy.back }), _jsx("button", { type: onNext ? "button" : "submit", className: "btn btn-primary", onClick: onNext, children: label })] }) });
}
