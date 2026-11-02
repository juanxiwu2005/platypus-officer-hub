import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore, useViewer } from "../data/store";
import { BUFFER_CHOICES, clubDraft, completeSetup, validateClub, validateGoals, validateProfile, validateRoles, validateWorkflow, validateWorkspace } from "../data/settings";
import { GoalsEditor, RolesEditor, WorkspaceEditor } from "../components/SettingsForms";
import { OrgChart } from "../components/setup/OrgChart";
import { WorkflowPanel } from "../components/setup/WorkflowPanel";
import { WorkflowChanges } from "../components/setup/WorkflowReview";
import { orgSteps } from "../engine/playbooks";
import { checkWorkflow, presetSteps, revertChange, withOwners } from "../engine/workflow";
import { callRetry, whyFailed } from "../lib/aiRetry";
import { ConstitutionStep } from "../components/setup/ConstitutionStep";
import { InviteLink } from "./Settings";
import { commandContext, humanEventDate, parseCommand, sanitizeOps, validDate } from "../lib/commands";
import { callApi } from "../lib/api";
import { fmtShort } from "../lib/dates";
import { Info } from "../components/ui";
import { fillEmails, orderRoles } from "../data/structure";
import { DUTY_BATCH, applyDuties, chunk, dutyItems, readLocally, relevantExcerpt, sanitizeDuties, sanitizeRead, structureFromRead } from "../lib/constitution";
import { deleteJson, loadJson, saveJson, saveLocalDoc } from "../lib/localDocs";
const STEPS = ["Your club", "Semester goals", "Officer roles", "Invite & workspace", "Event workflow", "First event"];
const DRAFT_ID = "setup-draft";
const NO_WF = { status: "idle", applied: [], refused: [], conflicts: [], summary: "", note: "", retry: false };
const TEMPLATE_NOTE = "No officer titles were found. These are standard departments and roles: edit them or add your own.";
export default function Setup() {
    const { state, dispatch } = useStore();
    const { canNudge } = useViewer();
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [draft, setDraft] = useState(() => clubDraft(state));
    const [inviteCode] = useState(() => crypto.randomUUID());
    const [sentence, setSentence] = useState("Plan Founder Dinner on Nov 19, 30 people, outside caterer, USG funding");
    const [event, setEvent] = useState(null);
    const [date, setDate] = useState("");
    const [source, setSource] = useState("");
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState("");
    const [confirmed, setConfirmed] = useState(false);
    const [buffer, setBuffer] = useState(BUFFER_CHOICES.includes(state.org.settings.clubBufferBusinessDays) ? state.org.settings.clubBufferBusinessDays : 3);
    const [doc, setDoc] = useState(null);
    const [reading, setReading] = useState({ status: "idle" });
    const [applied, setApplied] = useState(false);
    const touched = useRef(false);
    const missionTouched = useRef(false);
    const readFor = useRef("");
    const [steps, setSteps] = useState(() => withOwners(orgSteps(state), clubDraft(state).roles));
    const [wf, setWf] = useState(NO_WF);
    const wfTouched = useRef(false);
    // An unfinished setup is kept in this browser's database, so reloading (or signing in to the preview again) does not lose it.
    const [restorable, setRestorable] = useState(null);
    useEffect(() => { let on = true; void loadJson(DRAFT_ID).then(r => { if (on && r?.value?.v === 1 && Date.now() - Date.parse(r.savedAt) < 7 * 86400000)
        setRestorable(r); }); return () => { on = false; }; }, []);
    useEffect(() => {
        if (restorable || (step === 0 && !doc))
            return;
        const t = setTimeout(() => { void saveJson(DRAFT_ID, { v: 1, step, draft, steps, buffer, sentence, doc }); }, 700);
        return () => clearTimeout(t);
    }, [restorable, step, draft, steps, buffer, sentence, doc]);
    const wfIssues = useMemo(() => checkWorkflow(steps, draft.roles, state), [steps, draft.roles, state]);
    // The reading finishes while the president is on another step; apply it then, unless they already changed the structure.
    useEffect(() => {
        if (reading.status !== "ready" || applied || touched.current)
            return;
        apply(reading.read);
    }, [reading, applied]);
    if (!canNudge)
        return _jsxs("section", { className: "card", children: [_jsx("h1", { children: "Club setup" }), _jsx("p", { children: "The president or vice president sets up the club. Your own preferences are in Settings." }), _jsx(Link, { to: "/settings", children: "My preferences" })] });
    function apply(read) {
        setDraft(d => {
            const built = structureFromRead(read, { roles: d.roles, people: d.people });
            return { ...d, roles: built.roles, people: built.people, mission: read.source === "ai" && read.mission && !missionTouched.current ? read.mission : d.mission };
        });
        setApplied(true);
        touched.current = false;
    }
    /**
     * Started by Continue on step 1: save the text in this browser's database and let the AI read it while the president fills in the goals.
     * Short requests one after another (a request may last only 30 seconds and the AI answers one at a time): first the structure, which
     * fills in the departments and roles at once, then the duties, six positions at a time, which replace standard text as they arrive.
     */
    async function startReading(d, again = false) {
        if (!again && readFor.current === d.checksum)
            return;
        readFor.current = d.checksum;
        setApplied(false);
        setReading({ status: "reading" });
        void saveLocalDoc({ id: "constitution", kind: "constitution", fileName: d.fileName, text: d.text, checksum: d.checksum, savedAt: new Date().toISOString() });
        const current = () => readFor.current === d.checksum;
        const done = (read, note, retry) => current() && setReading({ status: "ready", read, note, retry, pending: 0 });
        if (!state.aiEnabled) {
            const r = readLocally(d.text);
            return done(r, r.source === "template" ? TEMPLATE_NOTE : "AI is off, so this was read in your browser. Check each line.", false);
        }
        const text = relevantExcerpt(d.text, 40000);
        // Each short request may fail on its own (the AI is slow, or busy with someone else's request). It is tried again twice; a sign-in problem is not.
        const call = (body) => callRetry("/setup/constitution", { text, ...body }, current);
        let read;
        try {
            read = sanitizeRead(await call({ part: "structure" }), "ai");
            if (!read.roles.length)
                throw new Error("No positions found");
        }
        catch (e) {
            const r = readLocally(d.text);
            return done(r, r.source === "template" ? TEMPLATE_NOTE : `AI could not read it${whyFailed(e)}, so this was read in your browser. Check each line.`, true);
        }
        const batches = chunk(dutyItems(read), DUTY_BATCH);
        if (!current())
            return;
        setReading({ status: "ready", read, note: "Suggested by AI. Reading each position's duties next.", retry: false, pending: batches.length });
        let missed = 0;
        for (let i = 0; i < batches.length && current(); i++) {
            try {
                const reply = await call({ part: "duties", items: batches[i] });
                const found = sanitizeDuties(reply, batches[i]);
                if (found.size)
                    setDraft(x => applyDuties(x, found));
            }
            catch {
                missed++;
            }
            setReading(r => r.status === "ready" ? { ...r, pending: batches.length - i - 1, note: batches.length - i - 1 > 0 ? `Suggested by AI. Reading duties: ${i + 1} of ${batches.length} parts done.` : r.note } : r);
        }
        done(read, missed ? "Suggested by AI. Some duties could not be read, so standard duties are filled in. Edit them." : "Suggested by AI from your constitution. Check each line.", missed > 0);
    }
    /**
     * Started by Continue on the workspace step. Onboarding deliberately begins with the standard workflow: planning
     * notes and fictional file uploads are not collected here, so setup never waits for an AI workflow-reading request.
     */
    function startWorkflow() {
        // Going back to the workspace links, or restoring a draft, must not discard
        // the workflow the president has already edited and reviewed.
        if (wfTouched.current || wf.status === "ready")
            return;
        wfTouched.current = false;
        setSteps(withOwners(presetSteps(), draft.roles));
        setWf({ ...NO_WF, status: "ready", note: "This is the standard workflow. Adjust it here to fit how your club works." });
    }
    const editSteps = (next) => { wfTouched.current = true; setSteps(next); };
    const restore = () => {
        if (!restorable)
            return;
        const v = restorable.value;
        setDraft(v.draft);
        setSteps(v.steps);
        setBuffer(v.buffer);
        setSentence(v.sentence);
        setDoc(v.doc);
        setStep(Math.max(0, Math.min(v.step, 4)));
        touched.current = true;
        missionTouched.current = true;
        wfTouched.current = true;
        if (v.doc)
            readFor.current = v.doc.checksum;
        setApplied(true);
        setRestorable(null);
    };
    const startOver = () => { void deleteJson(DRAFT_ID); setRestorable(null); };
    async function changeDoc(next) {
        setDoc(next);
        setNotice("");
        if (!next) {
            readFor.current = "";
            setReading({ status: "idle" });
            setApplied(false);
        }
    }
    const next = () => {
        let error = null;
        if (step === 0)
            error = !draft.name.trim() ? "Give your fictional club a name." : null;
        else if (step === 1)
            error = validateGoals(draft.goals) ?? (draft.mission.length > 300 ? "Keep the mission under 300 characters." : null);
        else if (step === 2) {
            const people = fillEmails(draft.people);
            error = validateRoles(draft.roles, people) ?? people.map(p => validateProfile({ ...p, asuId: p.asuId ?? "" })).find(Boolean) ?? (new Set(people.map(p => p.name.trim().toLowerCase())).size !== people.length ? "Each officer needs a different name." : null);
            if (!error)
                setDraft(d => ({ ...d, people }));
        }
        else if (step === 3)
            error = validateWorkspace(draft.workspace);
        else if (step === 4)
            error = validateWorkflow(steps, draft.roles);
        setNotice(error ?? "");
        if (error)
            return;
        if (step === 0 && doc)
            void startReading(doc);
        if (step === 3)
            void startWorkflow();
        setStep(step + 1);
    };
    async function prepare() {
        setBusy(true);
        setNotice("");
        setConfirmed(false);
        const ctx = commandContext({ ...state, people: draft.people, roles: draft.roles, events: [], nodes: [] });
        try {
            let ops = [], label = "Local demo grammar · AI off";
            if (state.aiEnabled) {
                try {
                    const result = await callApi("/command", { sentence, context: ctx });
                    ops = sanitizeOps(result.ops, ctx);
                    label = result.source === "ai" ? "AI draft · review below" : "Checked command grammar";
                }
                catch {
                    ops = parseCommand(sentence, ctx);
                    label = "Local demo fallback · server unavailable";
                }
            }
            else
                ops = parseCommand(sentence, ctx);
            if (ops.length !== 1 || ops[0].op !== "create_event") {
                setEvent(null);
                setNotice("Describe one event starting with Plan, then review its details.");
                return;
            }
            setEvent(ops[0]);
            setDate(humanEventDate(sentence, state.today));
            setSource(label);
        }
        finally {
            setBusy(false);
        }
    }
    const preview = event && validDate(date) && date >= state.today && !validateClub(draft) ? completeSetup(state, draft, event, date, inviteCode, undefined, undefined, steps) : null;
    const eventPatch = (patch) => { if (event)
        setEvent({ ...event, ...patch }); setConfirmed(false); };
    const setStructure = (patch) => { touched.current = true; setDraft(d => ({ ...d, ...patch })); };
    const banner = reading.status === "reading"
        ? _jsxs("p", { className: "notice ai-note", role: "status", children: [_jsx("span", { className: "spin", "aria-hidden": "true" }), "Reading your constitution. You can keep editing while you wait."] })
        : reading.status === "ready"
            ? _jsxs("p", { className: "notice ai-note", role: "status", children: [reading.pending > 0 && _jsx("span", { className: "spin", "aria-hidden": "true" }), reading.note, reading.read.notes.length > 0 && _jsx(Info, { children: reading.read.notes.join(" ") }), !applied && _jsx("button", { type: "button", className: "btn small", onClick: () => apply(reading.read), children: "Use these suggestions" }), reading.retry && doc && state.aiEnabled && _jsx("button", { type: "button", className: "btn small", onClick: () => void startReading(doc, true), children: "Try AI again" })] })
            : doc === null ? _jsx("p", { className: "small muted", children: "No constitution added. Standard departments are shown. Go back to step 1 to add one, or edit them yourself." }) : null;
    return _jsxs(_Fragment, { children: [_jsxs("div", { className: "page-head", children: [_jsx("h1", { children: "Set up your fictional club" }), _jsx("p", { className: "muted", children: "Six steps. Nothing is saved until you approve the first workflow." })] }), restorable && _jsxs("section", { className: "notice ai-note", role: "status", "data-testid": "setup-restore", children: ["You have an unfinished setup from ", new Date(restorable.savedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }), ".", _jsx("button", { type: "button", className: "btn small", onClick: restore, children: "Restore it" }), _jsx("button", { type: "button", className: "btn small", onClick: startOver, children: "Start over" })] }), _jsx("ol", { className: "setup-steps", "aria-label": "Setup progress", children: STEPS.map((s, i) => _jsxs("li", { "aria-current": i === step ? "step" : undefined, children: [i + 1, " \u00B7 ", s] }, s)) }), _jsxs("section", { className: "card form-stack", "data-testid": "setup-step", children: [_jsxs("header", { children: [_jsxs("h2", { children: ["Step ", step + 1, " of 6 \u00B7 ", STEPS[step]] }), _jsx(Link, { to: "/settings", onClick: () => void deleteJson(DRAFT_ID), children: "Cancel setup" })] }), step === 0 && _jsxs(_Fragment, { children: [_jsxs("div", { className: "form-grid", children: [_jsxs("label", { children: ["Club name", _jsx("input", { value: draft.name, maxLength: 80, onChange: e => setDraft({ ...draft, name: e.target.value }) })] }), _jsxs("label", { children: ["School", _jsx("input", { readOnly: true, value: state.org.school })] })] }), _jsx(ConstitutionStep, { doc: doc, onChange: changeDoc })] }), step === 1 && _jsxs(_Fragment, { children: [banner, _jsxs("label", { children: ["Club mission", _jsx("textarea", { rows: 2, value: draft.mission, maxLength: 300, onChange: e => { missionTouched.current = true; setDraft({ ...draft, mission: e.target.value }); } })] }), _jsx("p", { className: "small muted", children: "Choose two or three measurable goals. New workspace progress starts at zero." }), _jsx(GoalsEditor, { goals: draft.goals, onChange: goals => setDraft({ ...draft, goals }) })] }), step === 2 && _jsxs(_Fragment, { children: [banner, _jsx("p", { className: "small muted", children: "Fictional names only: example.org emails, 555-01xx phones and ASU IDs starting 9999. Leave a name empty for an open position." }), _jsx(RolesEditor, { roles: draft.roles, people: draft.people, editablePeople: true, onChange: (roles, people) => setStructure({ roles: orderRoles(roles), people }) }), _jsx(OrgChart, { roles: draft.roles }), _jsxs("label", { children: ["How many working days before the real deadline should your club finish?", _jsx("select", { "aria-label": "Days before the real deadline", value: buffer, onChange: e => setBuffer(Number(e.target.value)), children: BUFFER_CHOICES.map(d => _jsxs("option", { value: d, children: [d, " ", d === 1 ? "day" : "days", " before"] }, d)) })] }), _jsx("p", { className: "small muted", children: "This becomes your club deadline. For example, with 3 days, a task that is officially due Friday is due Tuesday for your club." })] }), step === 3 && _jsxs(_Fragment, { children: [_jsx(WorkspaceEditor, { value: draft.workspace, onChange: workspace => setDraft({ ...draft, workspace }), showPlanningMaterials: false }), _jsxs("details", { children: [_jsx("summary", { children: "Your invitation after setup" }), _jsx("p", { className: "small muted", children: "This invitation becomes active after you finish step 6." }), _jsx("code", { className: "wrap-link", children: `${window.location.origin}${window.location.pathname}#/join?invite=${inviteCode}` })] })] }), step === 4 && _jsxs(_Fragment, { children: [wf.note && _jsx("p", { className: "notice ai-note", role: "status", children: wf.note }), _jsx("p", { className: "small muted", children: "Every new event starts from this workflow. Start with the standard steps, then adjust the flow, owners and timing to match how your club works." }), _jsx(WorkflowChanges, { applied: wf.applied, refused: wf.refused, conflicts: wf.conflicts, summary: wf.summary, steps: steps, roles: draft.roles, onRevert: c => { wfTouched.current = true; setSteps(x => revertChange(x, c)); setWf(w => ({ ...w, applied: w.applied.filter(a => a.id !== c.id) })); } }), _jsx(WorkflowPanel, { state: state, steps: steps, roles: draft.roles, issues: wfIssues, onChange: editSteps }), _jsx("div", { className: "action-row", children: _jsx("button", { type: "button", className: "btn small", onClick: () => { wfTouched.current = true; setSteps(withOwners(presetSteps(), draft.roles)); setWf(w => ({ ...w, applied: [], refused: [], conflicts: [], summary: "" })); }, children: "Go back to the standard workflow" }) })] }), step === 5 && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Your first event, in one sentence", _jsx("textarea", { maxLength: 1000, rows: 3, value: sentence, onChange: e => { setSentence(e.target.value); setEvent(null); setConfirmed(false); } })] }), _jsx("button", { className: "btn", disabled: busy || !sentence.trim(), onClick: prepare, children: busy ? "Preparing…" : "Prepare first workflow" }), event && _jsxs(_Fragment, { children: [_jsxs("p", { className: "small muted", children: [source, ". Dates below come from your input and the rule book."] }), _jsxs("fieldset", { children: [_jsx("legend", { children: "Review your event" }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { children: ["Event name", _jsx("input", { maxLength: 80, value: event.name, onChange: e => eventPatch({ name: e.target.value }) })] }), _jsxs("label", { children: ["Confirm event date", _jsx("input", { type: "date", min: state.today, value: date, onChange: e => { setDate(e.target.value); setConfirmed(false); } })] }), _jsxs("label", { children: ["Event type", _jsx("select", { value: event.type, onChange: e => eventPatch({ type: e.target.value }), children: ["social", "speaker", "workshop", "meeting", "fundraiser", "offcampus"].map(t => _jsx("option", { children: t }, t)) })] }), _jsxs("label", { children: ["Headcount", _jsx("input", { type: "number", min: "1", max: "5000", value: event.headcount, onChange: e => eventPatch({ headcount: Number(e.target.value) }) })] }), _jsxs("label", { children: ["Venue", _jsxs("select", { value: event.venue, onChange: e => eventPatch({ venue: e.target.value }), children: [_jsx("option", { value: "campus", children: "Campus" }), _jsx("option", { value: "offcampus", children: "Off campus" })] })] }), _jsxs("label", { children: ["Food", _jsxs("select", { value: event.food, onChange: e => eventPatch({ food: e.target.value }), children: [_jsx("option", { value: "none", children: "None" }), _jsx("option", { value: "dining", children: "Sun Devil Dining" }), _jsx("option", { value: "offsite", children: "Outside caterer" }), _jsx("option", { value: "onsite", children: "Prepared on site" }), _jsx("option", { value: "tbd", children: "Yes, decide how later" })] })] }), _jsxs("label", { children: ["Funding", _jsx("select", { value: event.funding, onChange: e => eventPatch({ funding: e.target.value }), children: ["none", "usg", "college", "dues", "sponsor"].map(f => _jsx("option", { children: f }, f)) })] }), _jsxs("label", { className: "check-label", children: [_jsx("input", { type: "checkbox", checked: event.speaker, onChange: e => eventPatch({ speaker: e.target.checked }) }), "Includes a guest speaker"] })] })] }), preview && preview !== state && _jsxs("details", { open: true, "data-testid": "setup-preview", children: [_jsxs("summary", { children: [preview.nodes.length, " steps \u00B7 workflow preview"] }), _jsx("p", { className: "small muted", children: "ASU deadlines remain fixed by rules. Steps may need attention if this event is too soon." }), _jsx("ul", { className: "list", children: preview.nodes.slice(0, 6).map(n => _jsxs("li", { children: [_jsx("span", { children: n.title }), _jsxs("span", { className: "small muted", children: [draft.roles.find(r => r.fn === n.fn)?.displayName ?? n.fn, " \u00B7 due ", n.clubDeadline ? fmtShort(n.clubDeadline) : "unscheduled"] })] }, n.id)) })] }), _jsx("p", { className: "notice", children: "Finishing starts a new local demo workspace with these roles, goals and this event. It replaces existing fictional tasks, history and invitations. Cancel keeps your current workspace." }), _jsxs("label", { className: "check-label", children: [_jsx("input", { type: "checkbox", checked: confirmed, onChange: e => setConfirmed(e.target.checked) }), "I reviewed this event and want to start this demo workspace."] }), _jsx("button", { className: "btn btn-primary", disabled: !confirmed || !preview || preview === state || !event.name.trim() || event.headcount < 1 || event.headcount > 5000, onClick: () => { const error = validateClub(draft); if (error) {
                                            setNotice(error);
                                            return;
                                        } ; void deleteJson(DRAFT_ID); dispatch({ type: "completeSetup", draft: { ...draft, people: fillEmails(draft.people) }, event, date, inviteCode, clubBufferBusinessDays: buffer, workflow: steps }); navigate("/events"); }, children: "Approve & start workspace" })] })] }), notice && _jsx("p", { role: "alert", children: notice }), _jsxs("div", { className: "action-row", children: [step > 0 && _jsx("button", { className: "btn", onClick: () => { setStep(step - 1); setNotice(""); setConfirmed(false); }, children: "Back" }), step < 5 && _jsx("button", { className: "btn btn-primary", onClick: next, children: "Continue" })] })] }), state.org.setupCompletedOn && _jsxs("section", { className: "card", children: [_jsx("h2", { children: "Current workspace invitation" }), _jsx(InviteLink, { code: state.org.inviteCode })] })] });
}
