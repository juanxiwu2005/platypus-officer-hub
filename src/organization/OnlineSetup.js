import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState, } from "react";
import { Link } from "react-router-dom";
import { archiveFile, configureArchive, track, flushArchive, hasPendingArchive, exportRecords, downloadOriginal, listArchivedFiles, } from "./archive";
import { start, save, prepare, api, ApiError } from "./client";
import { blankRecoveryInputs, loadLocalRecovery, saveLocalRecovery, clearLocalRecoveryDraft, } from "./localDraftRecovery";
import { useSetupNavigationGuard } from "./useSetupNavigationGuard";
import { documentSource, readConstitution } from "./documents";
import { EXAMPLE_CONSTITUTION, blankDraft } from "./presets";
import { DEFAULT_TIMING, } from "../workspace/contracts/timing";
import { SetupAssistantPortal, SetupContextBridge, } from "../workspace/assistant";
import MembersPanel from "../workspace/members";
import { upgrade, reconcile, scopeKey, mergeConstitution, applyChanges, hasReviewedCheck, stable, now, COLORS, selectedRiskChanges, migrateReviewedCheck, } from "./setupLogic";
import { TeamChart, ActivityChart, arrangeTeam, nextRolePosition, } from "./SetupCharts";
import "./organization.css";
import "./setupV3.css";
const STEPS = [
    "Constitution",
    "Your team",
    "Responsibilities",
    "Activity workflow",
    "Review",
];
const HEADINGS = [
    "Start with your constitution.",
    "A team that looks like yours.",
    "Give every role a clear purpose.",
    "How your activities come together.",
    "Your organization, ready.",
];
const PURPOSE = [
    "Platypus uses your existing documents to prepare your team and its responsibilities. You review and approve the suggestions.",
    "Review departments first, then adjust positions and reporting lines. These guide how AI assigns future work.",
    "Review each role’s duties, then check for major gaps or conflicts. Your edits are saved as you go.",
    "Member-facing activities often repeat a familiar process. Review that process here; ad hoc board tasks will get their own workflow when you describe a task later.",
    "Review the settings you entered. On confirmation, Platypus saves a structured configuration for future AI requests.",
];
const uid = (prefix) => prefix + "_" + crypto.randomUUID().slice(0, 8);
// The local copy is validated for editing, allowing a temporarily empty title.
const recoveredDraft = (local) => migrateReviewedCheck({
    ...upgrade(blankDraft()),
    ...local,
    uiVersion: 3,
    departments: local.departments ?? [],
    messages: local.messages ?? [],
    generated: local.generated ?? {},
    riskCheck: local.riskCheck ?? upgrade(blankDraft()).riskCheck,
});
function Dialog({ title, children, close, }) {
    const ref = useRef(null);
    useEffect(() => {
        ref.current?.showModal();
    }, []);
    return (_jsxs("dialog", { ref: ref, className: "os-dialog v3-dialog", "aria-label": title, onCancel: close, children: [_jsxs("div", { className: "v3-toolbar", children: [_jsx("h2", { children: title }), _jsx("button", { onClick: close, children: "Close" })] }), children] }));
}
export default function OnlineSetup() {
    const [draft, setDraft] = useState(() => upgrade(blankDraft())), [entry, setEntry] = useState(null), [booting, setBooting] = useState(true), [error, setError] = useState(""), [saved, setSaved] = useState("Connecting…"), [busy, setBusy] = useState(null), [seconds, setSeconds] = useState(0), [reading, setReading] = useState(false), [pasteOpen, setPasteOpen] = useState(false), [paste, setPaste] = useState(""), [teamTab, setTeamTab] = useState("departments"), [selected, setSelected] = useState(""), [group, setGroup] = useState(""), [newRole, setNewRole] = useState(false), [roleTitle, setRoleTitle] = useState(""), [roleDept, setRoleDept] = useState(""), [chat, setChat] = useState(""), [proposal, setProposal] = useState(null), [riskIndex, setRiskIndex] = useState(0), [riskInstructions, setRiskInstructions] = useState({}), [selection, setSelection] = useState({
        screen: "team",
        entityType: null,
        entityId: null,
    }), [history, setHistory] = useState(null), [historyRevision, setHistoryRevision] = useState(null), [recoveryPending, setRecoveryPending] = useState(null), [recoveryNotice, setRecoveryNotice] = useState(""), [conflicted, setConflicted] = useState(false), [deep, setDeep] = useState(false), [files, setFiles] = useState(null), [exporting, setExporting] = useState(false), [finished, setFinished] = useState(false), [reviewTab, setReviewTab] = useState("team"), [reviewAffected, setReviewAffected] = useState(false), [reviewedAffected, setReviewedAffected] = useState([]);
    const dref = useRef(draft), eref = useRef(null), dirty = useRef(false), timer = useRef(), queue = useRef(Promise.resolve()), mounted = useRef(true), initial = useRef(null), lastSaved = useRef(""), inputsRef = useRef(blankRecoveryInputs()), autoChecks = useRef(new Set()), conflictRef = useRef(false), inputRecoveryFailed = useRef(false);
    const hasUnsentInputs = () => {
        const inputs = inputsRef.current;
        return !!(inputs.chat.trim() ||
            inputs.roleTitle.trim() ||
            inputs.newRole ||
            inputs.historyRevision !== null ||
            Object.values(inputs.riskInstructions).some((text) => text.trim()));
    };
    const remember = (snapshot = dref.current) => {
        if (!eref.current)
            return false;
        return saveLocalRecovery(eref.current.workspaceId, {
            baseRevision: eref.current.revision,
            draft: snapshot,
            inputs: inputsRef.current,
        }, setError);
    };
    const input = (fields) => {
        inputsRef.current = { ...inputsRef.current, ...fields };
        if (fields.chat !== undefined)
            setChat(fields.chat);
        if (fields.riskInstructions !== undefined)
            setRiskInstructions(fields.riskInstructions);
        if (fields.roleTitle !== undefined)
            setRoleTitle(fields.roleTitle);
        if (fields.roleDept !== undefined)
            setRoleDept(fields.roleDept);
        if (fields.newRole !== undefined)
            setNewRole(fields.newRole);
        if (fields.historyRevision !== undefined)
            setHistoryRevision(fields.historyRevision);
        inputRecoveryFailed.current = !remember();
    };
    const selectedContext = () => {
        const screen = dref.current.step === 1
            ? "team"
            : dref.current.step === 2
                ? "responsibilities"
                : dref.current.step === 3
                    ? "workflow"
                    : "review";
        const exists = selection.entityType === "role"
            ? dref.current.roles.some((r) => r.id === selection.entityId)
            : selection.entityType === "department"
                ? dref.current.departments.some((d) => d.id === selection.entityId)
                : selection.entityType === "node"
                    ? dref.current.memberFlow?.nodes.some((n) => n.id === selection.entityId)
                    : selection.entityId === null;
        return selection.screen === screen && exists
            ? selection
            : { screen, entityType: null, entityId: null };
    };
    const selectEntity = (entityType, entityId) => setSelection({ ...selectedContext(), entityType, entityId });
    const current = (d) => {
        dref.current = d;
        setDraft(d);
    };
    const persist = useCallback(async (confirm = false) => {
        if (timer.current)
            clearTimeout(timer.current);
        const work = queue.current
            .catch(() => { })
            .then(async () => {
            if (!eref.current)
                throw new Error("The online workspace is not connected.");
            if (conflictRef.current)
                throw new Error("Resolve the newer online version before saving. Your local copy is preserved.");
            const snapshot = structuredClone(dref.current);
            remember(snapshot);
            await flushArchive();
            if (!confirm && stable(snapshot) === lastSaved.current) {
                dirty.current = false;
                clearLocalRecoveryDraft(eref.current.workspaceId, eref.current.revision, inputsRef.current, setError);
                return;
            }
            setSaved(confirm ? "Compiling and saving…" : "Saving online…");
            const remote = await save(snapshot, eref.current.revision, confirm);
            eref.current = remote;
            setEntry(remote);
            lastSaved.current = stable(snapshot);
            if (stable(dref.current) === stable(snapshot)) {
                dirty.current = false;
                if (confirm) {
                    const confirmed = upgrade(remote.draft);
                    current(confirmed);
                    lastSaved.current = stable(confirmed);
                }
                clearLocalRecoveryDraft(remote.workspaceId, remote.revision, inputsRef.current, setError);
                setSaved(`Saved online · Revision ${remote.revision}`);
            }
        });
        queue.current = work;
        try {
            await work;
        }
        catch (e) {
            const localSaved = remember();
            if (e instanceof ApiError && e.status === 409) {
                conflictRef.current = true;
                setConflicted(true);
            }
            setSaved(localSaved
                ? "Not saved online · Local copy kept"
                : "Not saved online · Keep this page open");
            setError(e.message +
                (localSaved
                    ? ""
                    : " A local copy could not be saved. Keep this page open."));
            throw e;
        }
    }, []);
    const update = (next) => {
        current({ ...next, confirmed: false, confirmedAt: null, compiled: null });
        dirty.current = true;
        remember(dref.current);
        setSaved("Saving online…");
        if (timer.current)
            clearTimeout(timer.current);
        timer.current = setTimeout(() => void persist().catch(() => { }), 700);
    };
    const patch = (v) => update({ ...dref.current, ...v });
    const flushForAssistant = async () => {
        if (busy || reading)
            throw new Error("Wait for the current setup operation to finish.");
        if (conflictRef.current || recoveryPending)
            throw new Error("Resolve the newer online version before asking for another change.");
        await persist();
        await flushArchive();
    };
    const mutate = (next) => {
        try {
            update(reconcile(dref.current, next));
        }
        catch (e) {
            setError(e.message);
        }
    };
    const boot = useCallback(async () => {
        setBooting(true);
        setError("");
        try {
            const remote = await (initial.current ?? (initial.current = start()));
            initial.current = null;
            if (!mounted.current)
                return;
            configureArchive(remote.workspaceId, setError);
            eref.current = remote;
            setEntry(remote);
            let upgraded = upgrade(remote.draft);
            if (remote.draft.uiVersion !== 3) {
                upgraded.step =
                    remote.draft.step >= 4
                        ? remote.draft.step === 5
                            ? 4
                            : 3
                        : remote.draft.step;
                if (upgraded.roles.length &&
                    upgraded.roles.some((r) => r.quote && upgraded.source?.text.includes(r.quote)))
                    upgraded.generated.constitution = scopeKey(upgraded, "constitution");
            }
            const local = loadLocalRecovery(remote.workspaceId, setError);
            if (local) {
                inputsRef.current = local.inputs;
                setChat(local.inputs.chat);
                setRiskInstructions(local.inputs.riskInstructions);
                setRoleTitle(local.inputs.roleTitle);
                setRoleDept(local.inputs.roleDept);
                setNewRole(local.inputs.newRole);
                setHistoryRevision(local.inputs.historyRevision);
                if (local.draft && stable(local.draft) !== stable(remote.draft)) {
                    if (local.baseRevision === remote.revision) {
                        upgraded = recoveredDraft(local.draft);
                        setRecoveryNotice("Your unsaved local edits were recovered. Save them online when ready.");
                    }
                    else {
                        setRecoveryPending(local);
                        conflictRef.current = true;
                        setConflicted(true);
                    }
                }
            }
            current(upgraded);
            lastSaved.current = stable(remote.draft);
            dirty.current = stable(upgraded) !== lastSaved.current;
            track("workspace.opened", {
                step: upgraded.step,
                revision: remote.revision,
                uiVersion: 3,
            });
            setSaved(dirty.current
                ? "Recovered locally · Save online to continue"
                : `Saved online · Revision ${remote.revision}`);
            setFinished(upgraded.confirmed);
            window.dispatchEvent(new Event("platypus:workspace-refresh"));
            setSelected(upgraded.roles[0]?.id ?? "");
            setGroup(upgraded.departments[0]?.id ?? "");
            if (upgraded.step === 2 && upgraded.roles.length)
                setSelection({
                    screen: "responsibilities",
                    entityType: "role",
                    entityId: upgraded.roles[0].id,
                });
        }
        catch (e) {
            setError(e.message);
            setSaved("Online workspace unavailable");
        }
        finally {
            setBooting(false);
        }
    }, []);
    useEffect(() => {
        mounted.current = true;
        void boot();
        return () => {
            mounted.current = false;
            if (timer.current)
                clearTimeout(timer.current);
            void flushArchive().catch(() => { });
        };
    }, [boot]);
    useEffect(() => {
        const warn = (e) => {
            if (dirty.current ||
                hasPendingArchive() ||
                (inputRecoveryFailed.current && hasUnsentInputs())) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, []);
    useEffect(() => {
        const refresh = () => {
            if (!eref.current)
                return;
            if (dirty.current || busy || conflictRef.current) {
                remember();
                conflictRef.current = true;
                setConflicted(true);
                setError("The assistant saved a newer online change. Review it against your local edits before continuing.");
                return;
            }
            void queue.current
                .catch(() => { })
                .then(async () => {
                const remote = await start();
                if (!mounted.current ||
                    remote.workspaceId !== eref.current?.workspaceId)
                    return;
                const latest = upgrade(remote.draft);
                eref.current = remote;
                setEntry(remote);
                current(latest);
                lastSaved.current = stable(latest);
                dirty.current = false;
                setFinished(latest.confirmed);
                clearLocalRecoveryDraft(remote.workspaceId, remote.revision, inputsRef.current, setError);
                setSaved(`Saved online · Revision ${remote.revision}`);
            })
                .catch((e) => setError(e.message));
        };
        window.addEventListener("platypus:organization-changed", refresh);
        return () => window.removeEventListener("platypus:organization-changed", refresh);
    }, [busy]);
    useEffect(() => {
        if (!busy)
            return;
        setSeconds(0);
        const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(interval);
    }, [busy]);
    const run = async (stage, instruction = "") => {
        if (busy)
            return null;
        const preparationStarted = performance.now();
        setBusy(stage);
        setError("");
        try {
            await queue.current.catch(() => { });
            if (dirty.current)
                await persist();
            await flushArchive();
            if (!eref.current)
                throw new Error("Connect your workspace first.");
            const reply = await prepare(stage, eref.current.revision, instruction, deep, Math.round(performance.now() - preparationStarted), stage === "edit" ? selectedContext() : undefined);
            eref.current = {
                ...eref.current,
                revision: reply.revision,
                updatedAt: reply.updatedAt,
            };
            setEntry(eref.current);
            const { data, ...metadata } = reply.result;
            current({
                ...dref.current,
                aiRuns: [...dref.current.aiRuns.slice(-49), metadata],
            });
            lastSaved.current = "";
            dirty.current = true;
            remember();
            track("ai.suggestion.received", { stage, result: reply.result });
            return data;
        }
        catch (e) {
            if (e instanceof ApiError && e.status === 409) {
                conflictRef.current = true;
                setConflicted(true);
                remember();
            }
            setError(e.message);
            track("ai.error.shown", { stage, message: e.message });
            return null;
        }
        finally {
            setBusy(null);
        }
    };
    const source = async (file, text) => {
        setReading(true);
        setError("");
        try {
            const content = text ?? (await readConstitution(file)), s = await documentSource(content, file.name);
            const manifest = await archiveFile(file);
            patch({ source: { ...s, archiveId: manifest.id } });
            track("document.selected", {
                fileName: file.name,
                chars: s.text.length,
                checksum: s.checksum,
            });
            await persist();
            setPasteOpen(false);
        }
        catch (e) {
            setError(e.message);
            track("document.read.failed", { message: e.message });
        }
        finally {
            setReading(false);
        }
    };
    const next = async () => {
        setError("");
        const d = dref.current;
        try {
            if (d.step === 0) {
                if (d.roles.length &&
                    d.generated.constitution === scopeKey(d, "constitution")) {
                    patch({ step: 1 });
                    await persist();
                    return;
                }
                const data = await run("constitution");
                if (!data)
                    return;
                const merged = mergeConstitution(dref.current, data);
                merged.name = merged.name || data.name;
                merged.generated.constitution = scopeKey(merged, "constitution");
                merged.roles = arrangeTeam(merged.roles);
                merged.step = 1;
                update(merged);
                setSelected(merged.roles[0]?.id ?? "");
                setGroup(merged.departments[0]?.id ?? "");
                setTeamTab("departments");
                await persist();
                return;
            }
            if (d.step === 1) {
                if (!d.departments.length || !d.roles.length)
                    throw new Error("Add at least one department and role.");
                patch({ step: 2 });
                setSelected(d.roles[0].id);
                setGroup(d.roles[0].departmentId);
                setSelection({
                    screen: "responsibilities",
                    entityType: "role",
                    entityId: d.roles[0].id,
                });
                await persist();
                return;
            }
            if (d.step === 2) {
                if (!d.roles.length)
                    throw new Error("Prepare your team before continuing with responsibilities.");
                if (!hasReviewedCheck(d)) {
                    setSelected("check");
                    throw new Error("Complete the Check tab or choose Skip check before continuing.");
                }
                patch({ step: 3 });
                setSelection({ screen: "workflow", entityType: null, entityId: null });
                await persist();
                if (!d.memberFlow) {
                    const data = await run("member_workflow");
                    if (data) {
                        patch({
                            memberFlow: data,
                            generated: {
                                ...dref.current.generated,
                                member_workflow: scopeKey(dref.current, "member_workflow"),
                            },
                        });
                        await persist();
                    }
                }
                return;
            }
            if (d.step === 3) {
                if (!d.memberFlow)
                    throw new Error("Prepare your activity workflow first.");
                if (d.memberFlow.nodes.some((n) => n.needsReview))
                    throw new Error("Review the affected workflow changes before continuing.");
                if (d.memberFlow.nodes.some((n) => !n.title.trim()))
                    throw new Error("Give each workflow step a title.");
                patch({ step: 4 });
                setSelection({ screen: "review", entityType: null, entityId: null });
                await persist();
                return;
            }
            if (d.step === 4) {
                setBusy("guide");
                await persist(true);
                setFinished(true);
            }
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            if (d.step === 4)
                setBusy(null);
        }
    };
    const changeTiming = (values) => {
        if (Object.values(values).some((n) => !Number.isInteger(n) || n < 0 || n > 52))
            return;
        const offsets = {
            items: values.itemsWeeks * 7,
            quotes: values.quotesWeeks * 7,
            budget_request: values.budgetWeeks * 7,
        };
        const flow = dref.current.memberFlow;
        patch({
            timingDefaults: values,
            ...(flow
                ? {
                    memberFlow: {
                        ...flow,
                        nodes: flow.nodes.map((node) => node.milestoneKey && node.timing?.source !== "manual"
                            ? {
                                ...node,
                                timing: {
                                    offsetDays: offsets[node.milestoneKey],
                                    unit: "calendar",
                                    source: "organization-default",
                                },
                            }
                            : node),
                    },
                }
                : {}),
        });
        track("setup.timing-defaults.changed", { timingDefaults: values });
    };
    const goToChapter = async (step) => {
        if (busy || reading || booting || conflictRef.current || recoveryPending)
            return;
        if (!window.dispatchEvent(new Event("platypus:before-workspace-leave", { cancelable: true })))
            return;
        setError("");
        try {
            await persist();
            patch({ step });
            setFinished(false);
            const role = step === 2 ? dref.current.roles[0] : undefined;
            const screen = step === 1
                ? "team"
                : step === 2
                    ? "responsibilities"
                    : step === 3
                        ? "workflow"
                        : "review";
            setSelection({
                screen,
                entityType: role ? "role" : null,
                entityId: role?.id ?? null,
            });
            if (role) {
                setSelected(role.id);
                setGroup(role.departmentId);
            }
            else
                setSelected("");
            track("setup.chapter.changed", { step, source: "chapter-navigation" });
            await persist();
        }
        catch (e) {
            setError(e.message);
        }
    };
    const back = async () => {
        patch({ step: Math.max(0, dref.current.step - 1) });
        await persist().catch(() => { });
    };
    const addDepartment = () => {
        const id = uid("department");
        patch({
            departments: [
                ...draft.departments,
                {
                    id,
                    name: "New department",
                    color: COLORS[draft.departments.length % COLORS.length],
                    source: "manual",
                    quote: "",
                },
            ],
        });
    };
    const editDepartment = (id, fields) => mutate({
        ...draft,
        departments: draft.departments.map((d) => d.id === id ? { ...d, ...fields, source: "manual" } : d),
    });
    const removeRole = (id) => {
        const role = draft.roles.find((r) => r.id === id);
        if (!window.confirm(`Remove ${role?.title}? Affected workflow owners will need review. Prior versions remain archived.`))
            return;
        try {
            update(applyChanges(draft, [
                {
                    entity: "role",
                    id,
                    operation: "remove",
                    field: "title",
                    value: null,
                },
            ]));
        }
        catch (e) {
            setError(e.message);
        }
    };
    const send = async (text = chat, riskId) => {
        if (!text.trim() || busy)
            return;
        patch({
            messages: [
                ...draft.messages.slice(-198),
                { id: uid("message"), role: "user", text: text.trim(), at: now() },
            ],
        });
        input({ chat: "" });
        const result = (await run("edit", historyRevision === null
            ? text
            : `Use history revision ${historyRevision}: ${text}`));
        if (!result)
            return;
        patch({
            messages: [
                ...dref.current.messages.slice(-198),
                {
                    id: uid("message"),
                    role: "assistant",
                    text: result.question ?? result.message,
                    at: now(),
                },
            ],
        });
        if (result.changes.length) {
            try {
                const after = applyChanges(dref.current, result.changes);
                setProposal({
                    changes: result.changes,
                    message: result.message,
                    after,
                    riskId,
                });
                track("ai.proposal.previewed", { changes: result.changes });
            }
            catch (e) {
                setError(e.message);
            }
        }
        await persist().catch(() => { });
    };
    const check = async () => {
        const key = scopeKey(dref.current, "risk_check");
        if (dref.current.generated.risk_check === key) {
            setRiskIndex(0);
            return;
        }
        const result = (await run("risk_check"));
        if (!result)
            return;
        if (dref.current.riskCheck.status === "skipped" &&
            dref.current.riskCheck.inputKey === key) {
            track("responsibility.check.result.not-applied", {
                inputKey: key,
                reason: "User skipped the already-running check",
            });
            await persist().catch(() => { });
            return;
        }
        patch({
            riskCheck: {
                status: result.risks.length ? "unreviewed" : "complete",
                inputKey: key,
                risks: result.risks,
                answers: {},
                at: now(),
            },
            generated: { ...dref.current.generated, risk_check: key },
        });
        setRiskIndex(0);
        await persist().catch(() => { });
    };
    const risk = draft.riskCheck.risks[riskIndex], answers = draft.riskCheck.answers;
    const choose = (option) => {
        patch({
            riskCheck: {
                ...draft.riskCheck,
                answers: { ...answers, [risk.id]: option },
            },
        });
        if (riskIndex < draft.riskCheck.risks.length - 1)
            setRiskIndex(riskIndex + 1);
    };
    const reviewFixes = () => {
        try {
            const changes = selectedRiskChanges(draft);
            const after = applyChanges(draft, changes);
            setProposal({
                changes,
                message: "Apply the fixes you selected to the affected role duties.",
                after,
                check: true,
            });
        }
        catch (e) {
            setError(e.message);
        }
    };
    const accept = async () => {
        if (!proposal)
            return;
        try {
            if (proposal.riskId) {
                const optionId = uid("custom_fix");
                patch({
                    riskCheck: {
                        ...draft.riskCheck,
                        risks: draft.riskCheck.risks.map((r) => r.id === proposal.riskId
                            ? {
                                ...r,
                                options: [
                                    ...r.options.slice(0, 2),
                                    {
                                        id: optionId,
                                        label: "Your custom instructions",
                                        changes: proposal.changes,
                                    },
                                ],
                            }
                            : r),
                        answers: {
                            ...draft.riskCheck.answers,
                            [proposal.riskId]: optionId,
                        },
                    },
                });
                setProposal(null);
                if (riskIndex < draft.riskCheck.risks.length - 1)
                    setRiskIndex(riskIndex + 1);
                await persist();
                return;
            }
            let nextDraft = applyChanges(dref.current, proposal.changes);
            if (proposal.check)
                nextDraft = {
                    ...nextDraft,
                    riskCheck: {
                        ...nextDraft.riskCheck,
                        status: "complete",
                        inputKey: scopeKey(nextDraft, "risk_check"),
                        at: now(),
                    },
                };
            track("ai.proposal.accepted", { changes: proposal.changes });
            update(nextDraft);
            setProposal(null);
            await persist();
        }
        catch (e) {
            setError(e.message);
        }
    };
    useEffect(() => {
        if (!draft.roles.length ||
            draft.step !== 2 ||
            selected !== "check" ||
            busy ||
            recoveryPending ||
            conflicted ||
            hasReviewedCheck(draft))
            return;
        const key = scopeKey(draft, "risk_check");
        if (draft.generated.risk_check === key || autoChecks.current.has(key))
            return;
        const timer = setTimeout(() => {
            autoChecks.current.add(key);
            void check();
        }, 1200);
        return () => clearTimeout(timer);
    }, [
        draft.step,
        selected,
        draft.riskCheck,
        draft.generated,
        draft.roles,
        draft.departments,
        busy,
        recoveryPending,
        conflicted,
    ]);
    const selectedRole = draft.roles.find((r) => r.id === selected);
    const other = riskInstructions[risk?.id ?? ""] ?? "";
    const riskReply = risk
        ? draft.messages
            .filter((message, i) => message.role === "assistant" &&
            draft.messages[i - 1]?.text.includes(`risk "${risk.title}"`))
            .at(-1)?.text
        : undefined;
    const roleEdit = (role, fields) => mutate({
        ...draft,
        roles: draft.roles.map((r) => r.id === role.id
            ? {
                ...r,
                ...fields,
                manualFields: [
                    ...new Set([...(r.manualFields ?? []), ...Object.keys(fields)]),
                ],
            }
            : r),
    });
    const resolveRecovery = async (restore) => {
        const local = recoveryPending?.draft ?? dref.current;
        try {
            const remote = await start();
            if (remote.workspaceId !== eref.current?.workspaceId)
                throw new Error("Your workspace changed. The local copy is preserved for the original workspace.");
            eref.current = remote;
            setEntry(remote);
            lastSaved.current = stable(remote.draft);
            conflictRef.current = false;
            setConflicted(false);
            setRecoveryPending(null);
            setError("");
            if (restore) {
                track("workspace.recovery.accepted", {
                    onlineRevision: remote.revision,
                });
                setFinished(false);
                update(recoveredDraft(local));
                await persist();
                setRecoveryNotice("Your local copy was restored and saved as a new online revision.");
            }
            else {
                track("workspace.recovery.discarded", {
                    onlineRevision: remote.revision,
                });
                current(upgrade(remote.draft));
                setFinished(remote.draft.confirmed);
                dirty.current = false;
                clearLocalRecoveryDraft(remote.workspaceId, remote.revision, inputsRef.current, setError);
                setSaved(`Saved online · Revision ${remote.revision}`);
                setRecoveryNotice("The latest online version is open. Unsent form inputs remain on this device.");
            }
        }
        catch (e) {
            setError(e.message);
        }
    };
    const downloadRecovery = () => {
        const copy = recoveryPending ??
            (eref.current && loadLocalRecovery(eref.current.workspaceId, setError));
        if (!copy)
            return;
        const url = URL.createObjectURL(new Blob([JSON.stringify(copy, null, 2)], { type: "application/json" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = "organization-local-recovery.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const { pending: leaving } = useSetupNavigationGuard(async () => {
        if (!eref.current && !dirty.current)
            return true;
        if (busy || reading) {
            setError("Wait for the current operation to finish before leaving. Your local edits are preserved.");
            return false;
        }
        if (conflictRef.current || recoveryPending) {
            setError("Resolve the newer online version before leaving, or download your local copy.");
            return false;
        }
        await persist();
        await flushArchive();
        if (hasUnsentInputs() && !remember()) {
            inputRecoveryFailed.current = true;
            setError("Your unsent form inputs could not be saved on this device. Keep this page open; your online organization settings are saved.");
            return false;
        }
        inputRecoveryFailed.current = false;
        return true;
    }, { onError: (e) => setError(e instanceof Error ? e.message : String(e)) });
    const disabled = !!busy ||
        reading ||
        booting ||
        !entry ||
        conflicted ||
        !!recoveryPending ||
        leaving;
    const exportAll = async () => {
        setExporting(true);
        try {
            await persist();
            await exportRecords();
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setExporting(false);
        }
    };
    if (booting)
        return (_jsxs("div", { className: "os-loading", role: "status", children: [_jsx("span", { className: "os-spinner" }), "Opening your saved workspace\u2026"] }));
    return (_jsxs("div", { className: "os-root v3-root", onClickCapture: (e) => {
            const el = e.target.closest("button,a,summary");
            if (el)
                track("ui.clicked", {
                    screen: STEPS[draft.step],
                    text: el.textContent?.slice(0, 160),
                });
        }, onChangeCapture: (e) => {
            const t = e.target;
            track("ui.changed", {
                screen: STEPS[draft.step],
                field: t.getAttribute("aria-label") ?? t.name,
                value: t.type === "checkbox" ? t.checked : t.value,
            });
        }, onFocusCapture: (e) => {
            const target = e.target;
            const role = target.closest("[data-role-id]");
            const node = target.closest("[data-node-id]");
            const department = target.closest("[data-department-id]");
            if (role)
                selectEntity("role", role.dataset.roleId);
            else if (node)
                selectEntity("node", node.dataset.nodeId);
            else if (department)
                selectEntity("department", department.dataset.departmentId);
            track("ui.focused", {
                screen: STEPS[draft.step],
                field: target.getAttribute("aria-label"),
            });
        }, onBlurCapture: (e) => track("ui.blurred", {
            screen: STEPS[draft.step],
            field: e.target.getAttribute("aria-label"),
        }), children: [_jsx(SetupContextBridge, { beforeRequest: flushForAssistant, unsentInput: chat, onInputConsumed: () => {
                    input({ chat: "" });
                    track("setup.unsent-message.restored", {
                        destination: "workspace-assistant",
                    });
                }, context: {
                    ...(draft.step === 0
                        ? { screen: "constitution", entityType: null, entityId: null }
                        : selectedContext()),
                    workspaceId: entry?.workspaceId,
                    revision: entry?.revision,
                } }), _jsxs("div", { className: "v3-top", children: [_jsx(Link, { to: "/phase1", children: "\u2190 Home" }), _jsxs("span", { className: "v3-save", role: "status", children: ["\u25CF ", saved] }), _jsx("button", { disabled: exporting || !!busy, onClick: () => void exportAll(), children: exporting ? "Exporting…" : "Export records" })] }), (conflicted || recoveryPending) && (_jsxs("section", { className: "v3-recovery", "aria-label": "Resolve saved versions", children: [_jsx("h2", { children: "A newer online version needs your review." }), _jsx("p", { children: "Your complete local copy is preserved. Choose which version to continue with; no changes will be merged automatically." }), _jsxs("div", { className: "v3-toolbar", children: [_jsx("button", { onClick: () => void resolveRecovery(true), children: "Restore my local copy" }), _jsx("button", { onClick: () => void resolveRecovery(false), children: "Use latest online version" }), _jsx("button", { onClick: downloadRecovery, children: "Download local copy" })] })] })), recoveryNotice && (_jsxs("div", { className: "v3-recovery", role: "status", children: [recoveryNotice, _jsx("button", { onClick: () => setRecoveryNotice(""), children: "Dismiss" })] })), leaving && _jsx("p", { role: "status", children: "Saving your work before leaving\u2026" }), error && (_jsxs("div", { className: "os-error", role: "alert", children: [error, _jsx("button", { "aria-label": "Dismiss error", onClick: () => setError(""), children: "\u00D7" }), !entry && _jsx("button", { onClick: () => void boot(), children: "Reconnect" })] })), finished ? (_jsxs("div", { className: "v3-complete", children: [_jsx("span", { children: "\u2713" }), _jsx("h1", { children: "Your organization is ready." }), _jsx("p", { children: "Your confirmed settings and structured AI configuration are saved online. Previous versions remain in your records." }), _jsx("button", { onClick: () => {
                            setFinished(false);
                            setReviewTab("team");
                        }, children: "Review settings" }), _jsx(Link, { to: "/phase1", children: "Go to workspace \u2192" })] })) : (_jsxs(_Fragment, { children: [_jsx("nav", { tabIndex: 0, className: "v3-progress", "aria-label": "Organization setup progress", children: STEPS.map((s, i) => (_jsxs("button", { "aria-current": i === draft.step ? "step" : undefined, disabled: disabled, onClick: () => void goToChapter(i), children: [_jsx("b", { children: i === draft.step ? "•" : i + 1 }), s] }, s))) }), _jsxs("header", { className: "v3-heading", children: [_jsx("p", { children: "YOUR ORGANIZATION, UNDERSTOOD" }), _jsx("h1", { children: HEADINGS[draft.step] }), _jsx("p", { children: PURPOSE[draft.step] })] }), _jsxs("div", { className: `v3-layout ${draft.step === 0 ? "v3-source-layout" : ""}`, children: [_jsxs("section", { className: "v3-main", children: [_jsxs("fieldset", { disabled: disabled, children: [draft.step === 0 && (_jsxs("div", { className: "v3-source-panel", children: [_jsxs("section", { className: "v3-document-tools", "aria-label": "Organization documents", children: [_jsx("h2", { children: "Organization documents" }), _jsx("p", { children: "Your constitution and original uploads are kept here. Pasted text is stored as a separate text source." }), _jsx("button", { onClick: () => void listArchivedFiles()
                                                                    .then((x) => setFiles(x.uploads))
                                                                    .catch((e) => setError(e.message)), children: "View organization documents" })] }), _jsxs("label", { children: ["Organization name", _jsx("input", { "aria-label": "Organization name", maxLength: 100, value: draft.name, onChange: (e) => patch({ name: e.target.value }) })] }), _jsxs("div", { className: "v3-upload", children: [_jsx("span", { children: "\u25A4" }), _jsx("h2", { children: "Your existing constitution is the starting point." }), _jsx("p", { children: "PDF, Word (.docx), or text \u00B7 Up to 8 MB" }), _jsxs("label", { className: "v3-upload-button", children: ["Upload constitution", _jsx("input", { "aria-label": "Upload constitution", type: "file", accept: ".pdf,.docx,.txt,.md", onChange: (e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file)
                                                                                void source(file);
                                                                            e.target.value = "";
                                                                        } })] }), _jsxs("div", { className: "v3-source-options", children: [_jsx("button", { onClick: () => void source(new File([EXAMPLE_CONSTITUTION], "fictional-constitution.txt", { type: "text/plain" }), EXAMPLE_CONSTITUTION), children: "Use fictional example" }), _jsx("button", { onClick: () => setPasteOpen(true), children: "Paste text" })] })] }), reading && (_jsx("p", { role: "status", children: "Reading and archiving your document\u2026" })), draft.source && (_jsxs("div", { className: "v3-file", children: [_jsxs("b", { children: ["\u2713 ", draft.source.fileName] }), _jsxs("span", { children: [draft.source.text.length.toLocaleString(), " characters \u00B7 Original archived"] }), _jsx("button", { onClick: () => patch({ source: null }), children: "Remove source" })] })), _jsx("p", { className: "v3-note", children: "No constitution? AI can suggest a starting team for you to review. Only use fictional data in this prototype." })] })), draft.step === 1 && (_jsxs(_Fragment, { children: [!draft.roles.length && (_jsxs("div", { className: "v3-empty", role: "status", children: [_jsx("p", { children: "Prepare your team from Constitution, or add your departments and roles here." }), _jsx("button", { onClick: () => void goToChapter(0), children: "Go to Constitution" })] })), _jsxs("div", { className: "v3-toolbar", children: [_jsxs("div", { className: "v3-tabs", role: "tablist", "aria-label": "Team setup", children: [_jsx("button", { role: "tab", "aria-selected": teamTab === "departments", onClick: () => setTeamTab("departments"), children: "Departments" }), _jsx("button", { role: "tab", "aria-selected": teamTab === "chart", onClick: () => setTeamTab("chart"), children: "Organization chart" })] }), _jsx("button", { className: "v3-accent", onClick: () => {
                                                                    input({
                                                                        roleDept: draft.departments[0]?.id ?? "",
                                                                        newRole: true,
                                                                    });
                                                                }, children: "+ Add a custom role" })] }), teamTab === "departments" ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "v3-departments", children: draft.departments.map((dep) => (_jsxs("div", { className: "v3-department", "data-department-id": dep.id, children: [_jsx("input", { type: "color", "aria-label": `Color for ${dep.name}`, value: dep.color, onChange: (e) => editDepartment(dep.id, {
                                                                                color: e.target.value,
                                                                            }) }), _jsx("input", { "aria-label": `Department name ${dep.id}`, value: dep.name, maxLength: 180, onChange: (e) => editDepartment(dep.id, {
                                                                                name: e.target.value,
                                                                            }) }), _jsxs("span", { children: [dep.source === "constitution"
                                                                                    ? "From constitution"
                                                                                    : dep.source === "manual"
                                                                                        ? "Edited by you"
                                                                                        : "Suggested from duties", " ", "\u00B7", " ", draft.roles.filter((r) => r.departmentId === dep.id).length, " ", "roles"] }), _jsx("button", { "aria-label": `Remove department ${dep.name}`, disabled: draft.roles.some((r) => r.departmentId === dep.id), title: "Move its roles before removing this department", onClick: () => patch({
                                                                                departments: draft.departments.filter((d) => d.id !== dep.id),
                                                                            }), children: "\u00D7" })] }, dep.id))) }), _jsxs("div", { className: "v3-toolbar", children: [_jsx("button", { onClick: addDepartment, children: "+ Add department" }), _jsx("button", { className: "v3-primary", onClick: () => setTeamTab("chart"), children: "Review organization chart \u2192" })] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "v3-chart-toolbar", children: [_jsx("span", { children: "Drag a role onto another to change its reporting line, or connect their dots." }), _jsx("button", { onClick: () => patch({ roles: arrangeTeam(draft.roles) }), children: "Arrange" })] }), _jsx(TeamChart, { roles: draft.roles, departments: draft.departments, onChange: (roles) => {
                                                                    track("team.chart.changed", { roles });
                                                                    mutate({ ...draft, roles });
                                                                }, onRemove: removeRole, onSelect: (id) => {
                                                                    setSelected(id);
                                                                    selectEntity("role", id);
                                                                }, onError: setError })] })), _jsx(MembersPanel, { roleOptions: draft.roles, beforeSave: flushForAssistant })] })), draft.step === 2 && (_jsxs("div", { className: "v3-responsibility", children: [!draft.roles.length && (_jsxs("div", { className: "v3-empty", role: "status", children: [_jsx("p", { children: "Prepare your team before reviewing responsibilities. Your other settings stay saved." }), _jsx("button", { onClick: () => void goToChapter(1), children: "Go to Your team" })] })), _jsxs("div", { className: "v3-tabs v3-dept-tabs", role: "tablist", "aria-label": "Responsibility departments", children: [draft.departments.map((dep) => (_jsx("button", { role: "tab", "aria-selected": group === dep.id && selected !== "check", style: { borderBottomColor: dep.color }, onClick: () => {
                                                                    setGroup(dep.id);
                                                                    selectEntity("department", dep.id);
                                                                    setSelected(draft.roles.find((r) => r.departmentId === dep.id)
                                                                        ?.id ?? "");
                                                                }, children: dep.name }, dep.id))), _jsx("button", { role: "tab", "aria-selected": selected === "check", onClick: () => {
                                                                    setSelected("check");
                                                                    selectEntity(null, null);
                                                                }, children: "\u2713 Check" })] }), selected !== "check" ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "v3-tabs v3-role-tabs", role: "tablist", "aria-label": "Positions", children: draft.roles
                                                                    .filter((r) => r.departmentId === group)
                                                                    .map((r) => (_jsx("button", { role: "tab", "aria-selected": selected === r.id, onClick: () => {
                                                                        setSelected(r.id);
                                                                        selectEntity("role", r.id);
                                                                    }, children: r.title }, r.id))) }), selectedRole ? (_jsxs("div", { className: "v3-duties", "data-role-id": selectedRole.id, children: [_jsx("h2", { style: {
                                                                            borderLeftColor: draft.departments.find((d) => d.id === selectedRole.departmentId)?.color,
                                                                        }, children: selectedRole.title }), _jsx("ul", { children: selectedRole.responsibilities.map((duty, i) => (_jsxs("li", { children: [_jsx("span", { children: "\u2022" }), _jsx("input", { "aria-label": `Duty ${i + 1} for ${selectedRole.title}`, value: duty, maxLength: 240, onChange: (e) => roleEdit(selectedRole, {
                                                                                        responsibilities: selectedRole.responsibilities.map((x, n) => n === i ? e.target.value : x),
                                                                                    }) }), _jsx("button", { "aria-label": `Remove duty ${i + 1}`, onClick: () => roleEdit(selectedRole, {
                                                                                        responsibilities: selectedRole.responsibilities.filter((_, n) => n !== i),
                                                                                    }), children: "\u00D7" })] }, i))) }), _jsx("button", { disabled: selectedRole.responsibilities.length >= 12, onClick: () => roleEdit(selectedRole, {
                                                                            responsibilities: [
                                                                                ...selectedRole.responsibilities,
                                                                                "",
                                                                            ],
                                                                        }), children: "+ Add responsibility" }), _jsx("div", { className: "v3-duty-next", children: _jsx("button", { className: "v3-primary", onClick: () => {
                                                                                const index = draft.roles.findIndex((r) => r.id === selected);
                                                                                const nextRole = draft.roles[index + 1];
                                                                                setSelected(nextRole?.id ?? "check");
                                                                                selectEntity(nextRole ? "role" : null, nextRole?.id ?? null);
                                                                                if (nextRole)
                                                                                    setGroup(nextRole.departmentId);
                                                                            }, children: "Next position \u2192" }) })] })) : (_jsx("p", { children: "No roles in this department yet." }))] })) : (_jsxs("div", { className: "v3-check", children: [_jsx("h2", { children: "Check the important gaps." }), _jsx("p", { children: "AI checks for major missing responsibilities, unclear ownership, or conflicting authority. Ordinary shared work is fine." }), hasReviewedCheck(draft) ? (_jsxs("div", { className: "v3-check-done", children: [_jsxs("b", { children: ["\u2713", " ", draft.riskCheck.status === "skipped"
                                                                                ? "Check skipped by you."
                                                                                : "Responsibility review complete."] }), _jsx("button", { onClick: () => {
                                                                            autoChecks.current.delete(scopeKey(draft, "risk_check"));
                                                                            patch({
                                                                                riskCheck: {
                                                                                    ...draft.riskCheck,
                                                                                    status: "unreviewed",
                                                                                },
                                                                                generated: {
                                                                                    ...draft.generated,
                                                                                    risk_check: "",
                                                                                },
                                                                            });
                                                                        }, children: "Review again" })] })) : draft.generated.risk_check ===
                                                                scopeKey(draft, "risk_check") &&
                                                                draft.riskCheck.risks.length ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "v3-flashcard", children: [_jsxs("small", { children: ["QUESTION ", riskIndex + 1, " OF", " ", draft.riskCheck.risks.length] }), _jsx("h3", { children: risk?.title }), _jsx("p", { children: risk?.explanation }), _jsx("div", { className: "v3-risk-options", children: risk?.options.map((o) => (_jsx("button", { "aria-pressed": answers[risk.id] === o.id, onClick: () => choose(o.id), children: o.label }, o.id))) }), _jsxs("label", { children: ["Other / Give specific instructions", _jsx("textarea", { "aria-label": "Custom risk instruction", value: other, onChange: (e) => input({
                                                                                            riskInstructions: {
                                                                                                ...riskInstructions,
                                                                                                [risk.id]: e.target.value,
                                                                                            },
                                                                                        }), maxLength: 1000 })] }), riskReply && (_jsx("p", { role: "status", className: "v3-note", children: riskReply })), _jsx("button", { disabled: !other.trim(), onClick: () => void send(`For responsibility risk "${risk.title}": ${risk.explanation} Affected role IDs: ${risk.roleIds.join(", ")}. User instructions: ${other}. Propose a focused fix to these role duties.`, risk.id), children: "Ask AI for this fix" })] }), _jsxs("div", { className: "v3-toolbar", children: [_jsx("button", { disabled: riskIndex === 0, onClick: () => setRiskIndex(riskIndex - 1), children: "Previous question" }), riskIndex < draft.riskCheck.risks.length - 1 && (_jsx("button", { onClick: () => setRiskIndex(riskIndex + 1), children: "Next question" })), _jsx("button", { className: "v3-primary", disabled: draft.riskCheck.risks.some((r) => !answers[r.id]), onClick: reviewFixes, children: "Review selected fixes" })] })] })) : (_jsxs("div", { children: [_jsx("p", { role: "status", children: autoChecks.current.has(scopeKey(draft, "risk_check"))
                                                                            ? "The check could not finish. Retry when ready."
                                                                            : "The check starts shortly. You can skip before it begins." }), _jsx("button", { className: "v3-primary", onClick: () => {
                                                                            autoChecks.current.add(scopeKey(dref.current, "risk_check"));
                                                                            void check();
                                                                        }, children: "Check responsibilities with AI" })] })), !hasReviewedCheck(draft) && (_jsx("button", { className: "v3-skip", onClick: () => {
                                                                    track("responsibility.check.skipped", {
                                                                        inputKey: scopeKey(draft, "risk_check"),
                                                                    });
                                                                    patch({
                                                                        riskCheck: {
                                                                            ...draft.riskCheck,
                                                                            status: "skipped",
                                                                            inputKey: scopeKey(draft, "risk_check"),
                                                                            at: now(),
                                                                        },
                                                                    });
                                                                }, children: "Skip check for now" }))] }))] })), draft.step === 3 && (_jsxs(_Fragment, { children: [_jsxs("section", { className: "v3-timing", "aria-label": "Activity timing defaults", children: [_jsxs("div", { className: "v3-toolbar", children: [_jsx("h2", { children: "Timing" }), _jsx("button", { onClick: () => changeTiming({ ...DEFAULT_TIMING }), children: "Restore timing defaults" })] }), _jsx("p", { children: "Internal completion targets before an activity starts. These defaults apply to applicable purchasing steps; official deadlines still take precedence." }), [
                                                                ["itemsWeeks", "Confirm items"],
                                                                ["quotesWeeks", "Confirm quotes"],
                                                                ["budgetWeeks", "Submit budget request"],
                                                            ].map(([key, label]) => (_jsxs("label", { className: "v3-timing-row", children: [_jsx("span", { children: label }), _jsx("input", { "aria-label": `${label} weeks before activity`, type: "number", min: 0, max: 52, step: 1, value: (draft.timingDefaults ?? DEFAULT_TIMING)[key], onChange: (e) => changeTiming({
                                                                            ...(draft.timingDefaults ?? DEFAULT_TIMING),
                                                                            [key]: e.target.valueAsNumber,
                                                                        }) }), _jsx("span", { children: "weeks before" })] }, key))), _jsx("p", { className: "v3-note", children: "Saved targets guide future activities. Existing activity dates and manual task overrides are preserved." })] }), _jsx("div", { className: "v3-legend", children: draft.departments.map((dep) => (_jsxs("span", { children: [_jsx("i", { style: { background: dep.color } }), dep.name] }, dep.id))) }), draft.memberFlow ? (_jsxs(_Fragment, { children: [_jsx("h2", { className: "v3-flow-title", children: draft.memberFlow.title }), _jsx(ActivityChart, { flow: draft.memberFlow, roles: draft.roles, departments: draft.departments, timingDefaults: draft.timingDefaults ?? DEFAULT_TIMING, onChange: (memberFlow) => {
                                                                    track("workflow.changed", { memberFlow });
                                                                    patch({ memberFlow });
                                                                }, onError: setError, onSelect: (id) => selectEntity("node", id) }), draft.memberFlow.nodes.some((n) => n.needsReview) && (_jsxs("div", { className: "v3-review-note", role: "status", children: [_jsx("p", { children: "Some workflow steps use changed roles or responsibilities. Review those changes together before confirming." }), _jsx("button", { onClick: () => {
                                                                            setReviewedAffected([]);
                                                                            setReviewAffected(true);
                                                                        }, children: "Review affected changes" })] })), _jsx("p", { className: "v3-note", children: "Independent branches can run together. Select a line to remove it, or ask the assistant to adjust the workflow. Your existing dependency rules stay intact." })] })) : (_jsxs("div", { className: "v3-empty", children: [_jsx("p", { children: draft.roles.length
                                                                    ? "Your saved roles and responsibilities are ready. Prepare the activity workflow when you are ready."
                                                                    : "Prepare your team and responsibilities first. You can return here at any time." }), _jsx("button", { className: "v3-primary", disabled: !draft.roles.length, onClick: () => void run("member_workflow").then((data) => {
                                                                    if (data) {
                                                                        patch({ memberFlow: data });
                                                                        void persist();
                                                                    }
                                                                }), children: "Prepare activity workflow" })] }))] })), draft.step === 4 && (_jsxs(_Fragment, { children: [(!draft.roles.length || !draft.memberFlow) && (_jsxs("div", { className: "v3-empty", role: "status", children: [_jsx("p", { children: "Your setup is not complete yet. Prepare the team and activity workflow before confirming; you can visit any chapter." }), _jsx("button", { onClick: () => void goToChapter(!draft.roles.length ? 0 : 3), children: "Continue setup" })] })), draft.memberFlow?.nodes.some((n) => n.needsReview) && (_jsxs("div", { className: "v3-review-note", children: [_jsx("p", { children: "Review the steps affected by your recent changes." }), _jsx("button", { onClick: () => {
                                                                    setReviewedAffected([]);
                                                                    setReviewAffected(true);
                                                                }, children: "Review affected changes" })] })), _jsx("div", { className: "v3-tabs", role: "tablist", "aria-label": "Review settings", children: [
                                                            ["team", "Team"],
                                                            ["duties", "Responsibilities"],
                                                            ["workflow", "Activity workflow"],
                                                        ].map(([id, label]) => (_jsx("button", { role: "tab", "aria-selected": reviewTab === id, onClick: () => setReviewTab(id), children: label }, id))) }), reviewTab === "team" && (_jsxs(_Fragment, { children: [_jsx("h2", { children: draft.name }), draft.mission && _jsx("p", { children: draft.mission }), _jsxs("table", { className: "v3-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Department" }), _jsx("th", { children: "Position" }), _jsx("th", { children: "Reports to" })] }) }), _jsx("tbody", { children: draft.roles.map((r) => (_jsxs("tr", { children: [_jsxs("td", { children: [_jsx("i", { style: {
                                                                                                background: draft.departments.find((d) => d.id === r.departmentId)?.color,
                                                                                            } }), draft.departments.find((d) => d.id === r.departmentId)?.name] }), _jsx("td", { children: r.title }), _jsx("td", { children: draft.roles.find((x) => x.id === r.parentRoleId)?.title ?? "—" })] }, r.id))) })] })] })), reviewTab === "duties" &&
                                                        draft.roles.map((r) => (_jsxs("div", { className: "v3-review-duties", children: [_jsx("h3", { children: r.title }), _jsx("ul", { children: r.responsibilities.map((x, i) => (_jsx("li", { children: x }, i))) })] }, r.id))), reviewTab === "workflow" && draft.memberFlow && (_jsx(ActivityChart, { flow: draft.memberFlow, roles: draft.roles, departments: draft.departments, timingDefaults: draft.timingDefaults ?? DEFAULT_TIMING, onChange: (memberFlow) => {
                                                            track("workflow.changed", { memberFlow });
                                                            patch({ memberFlow });
                                                        }, onError: setError, onSelect: (id) => selectEntity("node", id) }))] }))] }), busy === "risk_check" && !hasReviewedCheck(draft) && (_jsxs("div", { className: "v3-recovery", children: [_jsx("p", { children: "The request already started. Skipping will not cancel that request or apply its suggestions." }), _jsx("button", { onClick: () => {
                                                    track("responsibility.check.skipped", {
                                                        inputKey: scopeKey(draft, "risk_check"),
                                                        requestAlreadyStarted: true,
                                                    });
                                                    patch({
                                                        riskCheck: {
                                                            ...draft.riskCheck,
                                                            status: "skipped",
                                                            inputKey: scopeKey(draft, "risk_check"),
                                                            at: now(),
                                                        },
                                                    });
                                                }, children: "Skip the running check" })] })), busy && (_jsxs("div", { className: "v3-busy", role: "status", children: [_jsx("span", { className: "os-spinner" }), _jsxs("div", { children: [_jsxs("b", { children: [busy === "constitution"
                                                                ? "Reading your constitution"
                                                                : busy === "risk_check"
                                                                    ? "Checking major responsibility risks"
                                                                    : busy === "edit"
                                                                        ? "Preparing a change for your approval"
                                                                        : busy === "guide"
                                                                            ? "Compiling and saving your organization"
                                                                            : "Preparing your activity workflow", "\u2026"] }), _jsxs("p", { children: [seconds, "s \u00B7 Your saved settings stay safe."] })] })] })), draft.step === 2 &&
                                        selected !== "check" &&
                                        !hasReviewedCheck(draft) && (_jsx("button", { className: "v3-skip", disabled: disabled, onClick: () => {
                                            track("responsibility.check.skipped", {
                                                inputKey: scopeKey(draft, "risk_check"),
                                            });
                                            patch({
                                                riskCheck: {
                                                    ...draft.riskCheck,
                                                    status: "skipped",
                                                    inputKey: scopeKey(draft, "risk_check"),
                                                    at: now(),
                                                },
                                            });
                                            setSelected("check");
                                        }, children: "Skip check for now" })), _jsxs("div", { className: "v3-footer", children: [_jsx("button", { disabled: disabled || draft.step === 0, onClick: () => void back(), children: "\u2190 Back" }), _jsx("span", { children: "Saved as you review" }), _jsx("button", { className: "v3-primary", disabled: disabled ||
                                                    (draft.step === 2 && !hasReviewedCheck(draft)) ||
                                                    (draft.step === 3 &&
                                                        !!draft.memberFlow?.nodes.some((n) => n.needsReview)) ||
                                                    (draft.step === 4 &&
                                                        (!draft.roles.length ||
                                                            !draft.memberFlow ||
                                                            !!draft.memberFlow?.nodes.some((n) => n.needsReview))), onClick: () => void next(), children: draft.step === 0
                                                    ? draft.roles.length &&
                                                        draft.generated.constitution ===
                                                            scopeKey(draft, "constitution")
                                                        ? "Continue to your team"
                                                        : "Let AI prepare my team"
                                                    : draft.step === 4
                                                        ? "Confirm organization"
                                                        : "Approve & continue" })] })] }), draft.step > 0 && (_jsx(SetupAssistantPortal, { children: _jsx("div", { className: "v3-root v3-setup-assistant-root", children: _jsxs("div", { className: "v3-assistant", children: [_jsxs("div", { className: "v3-assistant-title", children: [_jsx("span", { children: "\u2726" }), _jsxs("div", { children: [_jsx("b", { children: "Organization setup" }), _jsxs("small", { children: [STEPS[draft.step], " \u00B7 Connected to your setup"] })] })] }), _jsx("p", { className: "v3-note", children: "Tell me what to adjust. I\u2019ll show you the proposed changes before applying them." }), _jsx("div", { className: "v3-messages", "aria-live": "polite", children: draft.messages.length ? (draft.messages.slice(-12).map((m) => (_jsxs("div", { className: `v3-message v3-${m.role}`, children: [_jsx("small", { children: m.role === "user" ? "You" : "Platypus" }), _jsx("p", { children: m.text })] }, m.id)))) : (_jsx("div", { className: "v3-chat-examples", children: (draft.step === 1
                                                        ? [
                                                            "Move Marketing Intern under VP of Marketing.",
                                                            "Rename Outreach to Partnerships.",
                                                        ]
                                                        : draft.step === 2
                                                            ? [
                                                                "Check who owns our event budget.",
                                                                "Help clarify these two roles.",
                                                            ]
                                                            : [
                                                                "Run venue booking and promotion in parallel.",
                                                                "Add a feedback step after the activity.",
                                                            ]).map((x) => (_jsx("button", { disabled: disabled, onClick: () => input({ chat: x }), children: x }, x))) })) }), _jsx("button", { type: "button", disabled: disabled, onClick: () => void api("/api/org/archive?action=history")
                                                    .then((r) => setHistory(r.versions))
                                                    .catch((e) => setError(e.message)), children: "View configuration history" }), historyRevision !== null && (_jsxs("p", { className: "v3-note", children: ["Using history revision ", historyRevision, ". Describe what to restore; changes still need approval.", " ", _jsx("button", { type: "button", onClick: () => input({ historyRevision: null }), children: "Clear" })] })), _jsxs("form", { onSubmit: (e) => {
                                                    e.preventDefault();
                                                    void send();
                                                }, children: [_jsx("textarea", { "aria-label": "Ask Platypus about this setup", placeholder: "Describe a change\u2026", value: chat, onChange: (e) => input({ chat: e.target.value }), disabled: disabled, maxLength: 1200 }), _jsxs("div", { className: "v3-chat-controls", children: [_jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: deep, onChange: (e) => setDeep(e.target.checked), disabled: disabled }), "Deeper review (slower)"] }), _jsx("button", { className: "v3-primary", disabled: disabled || !chat.trim(), children: "Send \u2192" })] })] })] }) }) }))] })] })), _jsxs("div", { className: "v3-bottom", children: [_jsx("span", { children: "Timestamped records \u00B7 Private test workspace" }), _jsx(Link, { to: "/phase1/setup-legacy", children: "Previous setup reference" })] }), pasteOpen && (_jsxs(Dialog, { title: "Paste constitution text", close: () => setPasteOpen(false), children: [_jsxs("label", { children: ["Constitution text", _jsx("textarea", { "aria-label": "Constitution text", rows: 12, maxLength: 60000, value: paste, onChange: (e) => setPaste(e.target.value) })] }), _jsx("button", { className: "v3-primary", disabled: reading || paste.trim().length < 20, onClick: () => void source(new File([paste], "pasted-constitution.txt", {
                            type: "text/plain",
                        }), paste), children: "Use this text" })] })), newRole && (_jsxs(Dialog, { title: "Add a custom role", close: () => input({ newRole: false }), children: [_jsxs("label", { children: ["Role title", _jsx("input", { "aria-label": "Custom role title", value: roleTitle, maxLength: 180, onChange: (e) => input({ roleTitle: e.target.value }) })] }), _jsxs("label", { children: ["Department", _jsx("select", { "aria-label": "Custom role department", value: roleDept, onChange: (e) => input({ roleDept: e.target.value }), children: draft.departments.map((d) => (_jsx("option", { value: d.id, children: d.name }, d.id))) })] }), _jsx("button", { className: "v3-primary", disabled: !roleTitle.trim() || !roleDept, onClick: () => {
                            const id = uid("role");
                            patch({
                                roles: [
                                    ...draft.roles,
                                    {
                                        id,
                                        title: roleTitle.trim(),
                                        departmentId: roleDept,
                                        description: "",
                                        responsibilities: [],
                                        source: "manual",
                                        quote: "",
                                        confidence: 1,
                                        parentRoleId: null,
                                        position: nextRolePosition(draft.roles),
                                        manualFields: ["title", "departmentId"],
                                    },
                                ],
                            });
                            input({ roleTitle: "", newRole: false });
                            setTeamTab("chart");
                            setSelected(id);
                            selectEntity("role", id);
                        }, children: "Add role" })] })), proposal && (_jsxs(Dialog, { title: "Review proposed changes", close: () => {
                    track("ai.proposal.closed", { changes: proposal.changes });
                    setProposal(null);
                }, children: [_jsx("p", { children: proposal.message }), _jsx("div", { className: "v3-change-list", children: proposal.changes.map((c, i) => {
                            const before = c.entity === "role"
                                ? draft.roles.find((x) => x.id === c.id)
                                : c.entity === "department"
                                    ? draft.departments.find((x) => x.id === c.id)
                                    : draft.memberFlow?.nodes.find((x) => x.id === c.id);
                            const after = c.entity === "role"
                                ? proposal.after.roles.find((x) => x.id === c.id)
                                : c.entity === "department"
                                    ? proposal.after.departments.find((x) => x.id === c.id)
                                    : proposal.after.memberFlow?.nodes.find((x) => x.id === c.id);
                            const old = before
                                ? before[c.field]
                                : undefined;
                            const nextValue = after
                                ? after[c.field]
                                : undefined;
                            return (_jsxs("div", { children: [_jsxs("b", { children: [c.entity, " \u00B7", " ", "title" in (before ?? {})
                                                ? before.title
                                                : c.id, " ", "\u00B7 ", c.field] }), _jsxs("div", { className: "v3-before-after", children: [_jsxs("div", { children: [_jsx("small", { children: "Current" }), _jsx("p", { children: Array.isArray(old)
                                                            ? old.join(" • ")
                                                            : String(old ?? "—") })] }), _jsxs("div", { children: [_jsx("small", { children: "Proposed" }), _jsx("p", { children: c.operation === "remove"
                                                            ? "Remove"
                                                            : Array.isArray(nextValue)
                                                                ? nextValue.join(" • ")
                                                                : String(nextValue ?? "—") })] })] })] }, i));
                        }) }), _jsxs("div", { className: "v3-toolbar", children: [_jsx("button", { onClick: () => {
                                    track("ai.proposal.discarded", { changes: proposal.changes });
                                    setProposal(null);
                                }, children: "Keep current settings" }), _jsx("button", { className: "v3-primary", disabled: !!busy, onClick: () => void accept(), children: "Approve changes" })] })] })), history && (_jsxs(Dialog, { title: "Configuration history", close: () => setHistory(null), children: [_jsx("p", { children: "Choose a version, then tell the assistant which settings to restore. Nothing changes until you approve a proposal." }), history.length ? ([...history].reverse().map((v) => (_jsxs("div", { className: "v3-file", children: [_jsxs("b", { children: ["Revision ", v.revision, " \u00B7", " ", v.organization.name || "Organization"] }), _jsx("span", { children: new Date(v.at).toLocaleString() }), _jsx("button", { onClick: () => {
                                    input({ historyRevision: v.revision });
                                    setHistory(null);
                                }, children: "Use this version" })] }, v.revision)))) : (_jsx("p", { children: "No previous configuration versions yet." }))] })), reviewAffected && (_jsxs(Dialog, { title: "Review affected changes", close: () => setReviewAffected(false), children: [_jsx("p", { children: "Check the current owners and order for these steps. Unrelated steps are unchanged." }), draft.memberFlow?.nodes
                        .filter((n) => n.needsReview)
                        .map((n) => (_jsxs("label", { className: "v3-affected-row", children: [_jsx("input", { type: "checkbox", checked: reviewedAffected.includes(n.id), onChange: (e) => setReviewedAffected((ids) => e.target.checked
                                    ? [...ids, n.id]
                                    : ids.filter((id) => id !== n.id)) }), _jsxs("span", { children: [_jsx("b", { children: n.title }), _jsx("small", { children: n.roleIds
                                            .map((id) => draft.roles.find((r) => r.id === id)?.title)
                                            .filter(Boolean)
                                            .join(" · ") || "No owner assigned" })] })] }, n.id))), _jsx("button", { className: "v3-primary", disabled: draft.memberFlow?.nodes.some((n) => n.needsReview && !reviewedAffected.includes(n.id)), onClick: () => {
                            if (!draft.memberFlow)
                                return;
                            track("workflow.affected-changes.reviewed", {
                                nodeIds: reviewedAffected,
                            });
                            patch({
                                memberFlow: {
                                    ...draft.memberFlow,
                                    nodes: draft.memberFlow.nodes.map((n) => reviewedAffected.includes(n.id)
                                        ? { ...n, needsReview: false }
                                        : n),
                                },
                            });
                            setReviewAffected(false);
                            void persist().catch(() => { });
                        }, children: "Confirm reviewed changes" })] })), files && (_jsx(Dialog, { title: "Organization documents", close: () => setFiles(null), children: files.length ? (files.map((f) => (_jsxs("div", { className: "v3-file", children: [_jsx("b", { children: f.fileName }), _jsx("span", { children: f.createdAt }), _jsx("button", { onClick: () => void downloadOriginal(f.id).catch((e) => setError(e.message)), children: "Download original" })] }, f.id)))) : (_jsx("p", { children: "No original files yet." })) }))] }));
}
