import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useState } from "react";
import { Info } from "../../components/ui";
import { useStore } from "../../data/store";
import { MAX_DOC_CHARS } from "../../lib/readDocument";
import { SAMPLE_CONSTITUTION } from "../../lib/sampleConstitution";
import { onboardingCopy } from "../copy";
import { useOnboardingDraft } from "../draft";
import { useFlow } from "../engine/useFlow";
import { prepareDoc } from "./constitution/prepare";
import { useReading } from "./constitution/useReading";
const text = onboardingCopy.founder.constitution;
const ID = "founder.constitution";
/**
 * Screen 2 of the founder flow (optional): where the officer roles come from. Choosing a document starts the AI reading in the background and
 * Continue is available at once; the result is applied to the roles as soon as it arrives (see constitution/useReading.ts).
 */
export function Constitution() {
    const { draft, update, patch } = useOnboardingDraft();
    const { state } = useStore();
    const flow = useFlow();
    const reader = useReading();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [pasting, setPasting] = useState(false);
    const [paste, setPaste] = useState("");
    const fileInput = useRef(null);
    const { doc, reading } = draft;
    /** Remember the document, take this step off the skipped list, and let the AI start reading. */
    const choose = (next) => {
        update(d => ({ ...d, doc: next, applied: false, skipped: d.skipped.filter(id => id !== ID) }));
        void reader.start(next);
    };
    const run = async (task) => {
        setBusy(true);
        setError("");
        try {
            choose(await task());
            setPasting(false);
            setPaste("");
        }
        catch (e) {
            setError(e instanceof Error ? e.message : text.unreadable);
        }
        finally {
            setBusy(false);
        }
    };
    const remove = () => { reader.stop(); patch({ doc: null, reading: { status: "idle" }, applied: false }); setError(""); };
    const skip = () => { reader.stop(); patch({ doc: null, reading: { status: "idle" }, applied: false }); flow?.skip(); };
    const words = doc ? doc.text.split(/\s+/).filter(Boolean).length : 0;
    return _jsxs("section", { className: "ob-card ob-const", "aria-labelledby": "ob-const-h", children: [_jsx("h1", { id: "ob-const-h", children: text.title }), _jsxs("p", { className: "ob-const-lead", children: [text.lead, _jsx(Info, { label: "How your text is used", children: text.leadMore })] }), doc ? _jsxs("div", { className: "doc-chip", "data-testid": "constitution-chip", children: [_jsx("b", { children: doc.fileName }), _jsxs("span", { children: [words.toLocaleString("en-US"), " ", text.words] }), _jsx("button", { type: "button", className: "btn small", onClick: remove, children: text.remove })] }) : _jsx(_Fragment, { children: _jsxs("ul", { className: "ob-const-options", children: [_jsx("li", { children: _jsxs("button", { type: "button", className: "ob-const-option is-recommended", disabled: busy, onClick: () => void run(() => prepareDoc(text.sampleName, SAMPLE_CONSTITUTION)), children: [_jsx("b", { children: text.sample }), _jsxs("span", { children: [_jsx("em", { children: text.recommended }), " \u00B7 ", text.fictional] })] }) }), _jsxs("li", { children: [_jsx("button", { type: "button", className: "ob-const-option", disabled: busy, onClick: () => fileInput.current?.click(), children: _jsx("b", { children: text.upload }) }), _jsx("input", { ref: fileInput, type: "file", hidden: true, accept: ".pdf,.docx,.txt,.md", "aria-label": text.fileLabel, tabIndex: -1, onChange: event => { const f = event.target.files?.[0]; event.target.value = ""; if (f)
                                        void run(() => prepareDoc(f.name, "", f)); } })] }), _jsxs("li", { children: [_jsx("button", { type: "button", className: "ob-const-option", "aria-expanded": pasting, "aria-controls": "ob-const-paste", disabled: busy, onClick: () => setPasting(!pasting), children: _jsx("b", { children: text.paste }) }), pasting && _jsxs("div", { id: "ob-const-paste", className: "ob-const-paste", children: [_jsxs("label", { className: "field", children: [text.pasteLabel, _jsx("textarea", { rows: 6, maxLength: MAX_DOC_CHARS, value: paste, "aria-describedby": "ob-const-paste-note", onChange: event => setPaste(event.target.value) })] }), _jsx("p", { id: "ob-const-paste-note", className: "sr-only", children: text.pasteFictional }), _jsx("button", { type: "button", className: "btn btn-primary small", disabled: busy || paste.trim().length < 20, onClick: () => void run(() => prepareDoc(text.pastedName, paste)), children: text.pasteUse })] })] })] }) }), error && _jsx("p", { role: "alert", className: "ob-const-error", children: error }), doc && reading.status === "reading" && _jsxs("p", { className: "notice ai-note", role: "status", children: [_jsx("span", { className: "spin", "aria-hidden": "true" }), text.reading] }), doc && reading.status === "ready" && _jsxs("p", { className: "notice ai-note", role: "status", "data-testid": "reading-note", children: [reading.pending > 0 && _jsx("span", { className: "spin", "aria-hidden": "true" }), reading.pending > 0 ? text.reading2 : reading.note, reading.pending === 0 && reading.retry && state.aiEnabled && _jsx("button", { type: "button", className: "btn small", onClick: () => void reader.start(doc, true), children: text.retry })] }), _jsxs("div", { className: "ob-actions ob-const-actions", children: [_jsx("button", { type: "button", className: "btn", onClick: () => flow?.back(), children: onboardingCopy.back }), _jsx("button", { type: "button", className: "btn btn-primary", disabled: busy, onClick: () => flow?.next(), children: onboardingCopy.next })] }), _jsxs("div", { className: "ob-const-skip", children: [_jsx("button", { type: "button", className: "btn btn-quiet", onClick: skip, children: text.skip }), !doc && _jsx("p", { className: "small muted", children: onboardingCopy.skipHint })] })] });
}
