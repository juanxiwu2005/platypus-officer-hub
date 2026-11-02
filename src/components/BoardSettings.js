import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useStore } from "../data/store";
import { canLead } from "../data/changeReview";
import { Empty, PALETTE, STATUS_DEFAULTS, STATUS_ORDER, useStatusStyles } from "./ui";
const FIELDS = [
    { id: "owner", label: "Owner" }, { id: "due", label: "Due date" }, { id: "event", label: "Event" }, { id: "tags", label: "Tags" },
];
const BOARD_STATUSES = STATUS_ORDER;
/** Rename statuses, pick colours, manage tags and card fields. Meanings never change (decision 4). Saves as you go. */
export function BoardSettingsPanel() {
    const { state, dispatch } = useStore();
    const styles = useStatusStyles();
    const board = state.org.board ?? {};
    const [tagName, setTagName] = useState("");
    const [tagColor, setTagColor] = useState(PALETTE[6]);
    if (!canLead(state))
        return _jsx(Empty, { children: "The president or VP customizes the board." });
    const save = (patch) => dispatch({ type: "saveBoard", board: { ...board, fields: board.fields ?? FIELDS.map(f => f.id), ...patch } });
    const tags = board.tags ?? [];
    const fields = board.fields ?? FIELDS.map(f => f.id);
    return _jsxs("section", { className: "form-stack", "aria-label": "Customize the board", "data-testid": "board-settings", children: [_jsx("h2", { children: "Customize the board" }), _jsx("h3", { children: "Status names and colours" }), BOARD_STATUSES.map(st => _jsxs("div", { className: "status-edit", children: [_jsx("span", { className: "pill sm", style: { "--pill": styles[st].color }, children: styles[st].label }), _jsxs("div", { className: "form-stack tight", children: [_jsx("input", { "aria-label": `Name for ${STATUS_DEFAULTS[st].label}`, defaultValue: board.labels?.[st] ?? "", placeholder: STATUS_DEFAULTS[st].label, maxLength: 24, onBlur: e => save({ labels: { ...board.labels, [st]: e.target.value } }) }), _jsx("div", { className: "swatches", role: "group", "aria-label": `Colour for ${STATUS_DEFAULTS[st].label}`, children: PALETTE.map(c => _jsx("button", { type: "button", className: "swatch", style: { "--sw": c }, "aria-label": c, "aria-pressed": styles[st].color === c, onClick: () => save({ colors: { ...board.colors, [st]: c } }) }, c)) })] })] }, st)), _jsx("h3", { children: "Tags" }), _jsxs("div", { className: "tag-row", children: [tags.map(t => _jsxs("span", { className: "tag-chip", style: { "--tag": t.color }, children: [t.label, " ", _jsx("button", { type: "button", className: "link", "aria-label": `Remove tag ${t.label}`, onClick: () => save({ tags: tags.filter(x => x.id !== t.id) }), children: "\u00D7" })] }, t.id)), !tags.length && _jsx("span", { className: "small muted", children: "No tags yet." })] }), _jsxs("form", { className: "board-add", onSubmit: e => { e.preventDefault(); if (!tagName.trim())
                    return; const t = { id: `tag-${Date.now().toString(36)}`, label: tagName.trim(), color: tagColor }; save({ tags: [...tags, t] }); setTagName(""); }, children: [_jsx("input", { value: tagName, onChange: e => setTagName(e.target.value), maxLength: 20, placeholder: "New tag, e.g. Food", "aria-label": "New tag name" }), _jsx("button", { className: "btn small", type: "submit", children: "Add tag" })] }), _jsx("div", { className: "swatches", role: "group", "aria-label": "New tag colour", children: PALETTE.map(c => _jsx("button", { type: "button", className: "swatch", style: { "--sw": c }, "aria-label": c, "aria-pressed": tagColor === c, onClick: () => setTagColor(c) }, c)) }), _jsx("h3", { children: "Show on cards" }), _jsx("div", { className: "checks", children: FIELDS.map(f => _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: fields.includes(f.id), onChange: e => save({ fields: e.target.checked ? [...fields, f.id] : fields.filter(x => x !== f.id) }) }), " ", f.label] }, f.id)) }), _jsx("button", { type: "button", className: "btn btn-quiet small", onClick: () => dispatch({ type: "saveBoard", board: { tags, fields: FIELDS.map(f => f.id) } }), children: "Restore default names and colours" })] });
}
