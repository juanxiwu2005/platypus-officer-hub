import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { onboardingCopy } from "../../copy";
import { DemoStrip } from "../../shell/DemoStrip";
const c = onboardingCopy.member.invitation;
/** The amber Demo strip for the member preview: who is being previewed, and a small picker to change it. Nothing here verifies an identity. */
export function MemberStrip({ preview, note = false }) {
    const { state, person, picking, setPicking, choose } = preview;
    const select = useRef(null);
    const change = useRef(null);
    const wasPicking = useRef(false);
    useEffect(() => {
        if (picking)
            select.current?.focus();
        else if (wasPicking.current)
            change.current?.focus();
        wasPicking.current = picking;
    }, [picking]);
    if (!person)
        return null;
    return _jsx("div", { className: "ob-m-strip", "data-testid": "member-strip", children: _jsxs(DemoStrip, { children: [c.previewing, " ", _jsx("b", { children: person.name }), " ", picking
                    ? _jsx("select", { ref: select, className: "ob-m-pick", "aria-label": c.changeLabel, value: person.id, onChange: e => choose(e.target.value), onBlur: () => setPicking(false), onKeyDown: e => { if (e.key === "Escape")
                            setPicking(false); }, children: state.people.map(p => _jsxs("option", { value: p.id, children: [p.name, " \u00B7 ", state.roles.find(r => r.id === p.roleId)?.displayName] }, p.id)) })
                    : _jsx("button", { ref: change, type: "button", className: "ob-m-link", onClick: () => setPicking(true), children: c.change }), note && _jsx("span", { className: "ob-m-note", children: c.demoNote })] }) });
}
