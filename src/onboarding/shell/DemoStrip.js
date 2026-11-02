import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { onboardingCopy } from "../copy";
/** A narrow amber strip, same look as the Demo pill in the app. The member preview puts "Previewing as …" in it. */
export function DemoStrip({ children }) {
    return _jsxs("p", { className: "ob-demo-strip", role: "note", children: [_jsx("b", { children: onboardingCopy.demo.toUpperCase() }), " ", _jsx("span", { children: children ?? onboardingCopy.demoNote })] });
}
