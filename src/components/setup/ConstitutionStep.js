import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { SAMPLE_CONSTITUTION } from "../../lib/sampleConstitution";
import { MAX_DOC_CHARS, documentSource, readDocumentFile } from "../../lib/readDocument";
/** Prepare text for setup: read the file in this browser, hide emails and phone numbers, and fingerprint it. Nothing is sent anywhere here. */
async function prepare(fileName, text, file) {
    const raw = file ? await readDocumentFile(file) : text.replace(/\r\n?/g, "\n").trim();
    if (raw.length < 20)
        throw new Error("Add a little more text: at least a sentence or two.");
    if (raw.length > MAX_DOC_CHARS)
        throw new Error("This document is very long. Paste the sections about officers and departments.");
    const src = await documentSource(raw, fileName);
    return { fileName, text: src.text, checksum: src.checksum };
}
/** Step 1: choose the constitution. The AI reads it after Continue; until then it only sits in this page. */
export function ConstitutionStep({ doc, onChange }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [pasting, setPasting] = useState(false);
    const [paste, setPaste] = useState("");
    const run = async (task) => {
        setBusy(true);
        setError("");
        try {
            onChange(await task());
            setPasting(false);
            setPaste("");
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "This file could not be read.");
        }
        finally {
            setBusy(false);
        }
    };
    return _jsxs("section", { className: "upload-box", "data-testid": "constitution-upload", "aria-labelledby": "const-h", children: [_jsxs("h3", { id: "const-h", children: ["Upload your constitution ", _jsx("span", { className: "muted", children: "(optional)" })] }), doc ? _jsxs("div", { className: "doc-chip", "data-testid": "constitution-chip", children: [_jsx("b", { children: doc.fileName }), _jsxs("span", { children: [doc.text.split(/\s+/).length.toLocaleString("en-US"), " words ready"] }), _jsx("button", { type: "button", className: "btn small", onClick: () => onChange(null), children: "Remove" })] }) : _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Constitution file", _jsx("input", { type: "file", accept: ".pdf,.docx,.txt,.md", disabled: busy, onChange: e => { const f = e.target.files?.[0]; e.target.value = ""; if (f)
                                    void run(() => prepare(f.name, "", f)); } })] }), _jsx("p", { className: "small muted", children: "PDF, Word (.docx), .txt or .md. It is read in your browser." }), _jsxs("div", { className: "action-row", children: [_jsx("button", { type: "button", className: "btn small", disabled: busy, onClick: () => void run(() => prepare("Sample constitution (fictional).txt", SAMPLE_CONSTITUTION)), children: "Use the sample constitution" }), _jsx("button", { type: "button", className: "btn small", disabled: busy, onClick: () => setPasting(!pasting), "aria-expanded": pasting, children: "Paste text instead" })] }), pasting && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Constitution text", _jsx("textarea", { rows: 6, maxLength: MAX_DOC_CHARS, value: paste, onChange: e => setPaste(e.target.value) })] }), _jsx("button", { type: "button", className: "btn small", disabled: busy || paste.trim().length < 20, onClick: () => void run(() => prepare("Pasted constitution.txt", paste)), children: "Use this text" })] })] }), busy && _jsx("p", { className: "small", role: "status", children: "Reading the file\u2026" }), error && _jsx("p", { role: "alert", className: "small", children: error }), _jsx("p", { className: "small muted", children: "After you press Continue, AI reads it in the background to find departments, roles and duties. It is also saved in this browser. Fictional example only: never add a real constitution or member details." })] });
}
