import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  archiveFile,
  configureArchive,
  track,
  flushArchive,
  hasPendingArchive,
  exportRecords,
  downloadOriginal,
  listArchivedFiles,
  type ArchivedFile,
} from "./archive";
import { start, save, prepare } from "./client";
import { documentSource, readConstitution } from "./documents";
import { EXAMPLE_CONSTITUTION, blankDraft } from "./presets";
import {
  type Envelope,
  type Stage,
  type Department,
  type OrgRole,
  type OrgChange,
  type OrgFlow,
  type RiskIssue,
} from "./schema";
import {
  upgrade,
  reconcile,
  scopeKey,
  mergeConstitution,
  applyChanges,
  hasReviewedCheck,
  stable,
  now,
  COLORS,
  selectedRiskChanges,
  type SetupV3,
} from "./setupLogic";
import { TeamChart, ActivityChart, arrangeTeam } from "./SetupCharts";
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
const uid = (prefix: string) => prefix + "_" + crypto.randomUUID().slice(0, 8);
function Dialog({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="os-dialog v3-dialog"
      aria-label={title}
      onCancel={close}
    >
      <div className="v3-toolbar">
        <h2>{title}</h2>
        <button onClick={close}>Close</button>
      </div>
      {children}
    </dialog>
  );
}
type Proposal = {
  changes: OrgChange[];
  message: string;
  after: SetupV3;
  check?: boolean;
  riskId?: string;
};
export default function OnlineSetup() {
  const [draft, setDraft] = useState<SetupV3>(() => upgrade(blankDraft())),
    [entry, setEntry] = useState<Envelope | null>(null),
    [booting, setBooting] = useState(true),
    [error, setError] = useState(""),
    [saved, setSaved] = useState("Connecting…"),
    [busy, setBusy] = useState<Stage | null>(null),
    [seconds, setSeconds] = useState(0),
    [reading, setReading] = useState(false),
    [pasteOpen, setPasteOpen] = useState(false),
    [paste, setPaste] = useState(""),
    [teamTab, setTeamTab] = useState<"departments" | "chart">("departments"),
    [selected, setSelected] = useState(""),
    [group, setGroup] = useState(""),
    [newRole, setNewRole] = useState(false),
    [roleTitle, setRoleTitle] = useState(""),
    [roleDept, setRoleDept] = useState(""),
    [chat, setChat] = useState(""),
    [proposal, setProposal] = useState<Proposal | null>(null),
    [riskIndex, setRiskIndex] = useState(0),
    [other, setOther] = useState(""),
    [deep, setDeep] = useState(false),
    [files, setFiles] = useState<ArchivedFile[] | null>(null),
    [exporting, setExporting] = useState(false),
    [finished, setFinished] = useState(false),
    [reviewTab, setReviewTab] = useState("team");
  const dref = useRef(draft),
    eref = useRef<Envelope | null>(null),
    dirty = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout>>(),
    queue = useRef<Promise<void>>(Promise.resolve()),
    mounted = useRef(true),
    initial = useRef<ReturnType<typeof start> | null>(null),
    lastSaved = useRef("");
  const current = (d: SetupV3) => {
    dref.current = d;
    setDraft(d);
  };
  const persist = useCallback(async (confirm = false) => {
    if (timer.current) clearTimeout(timer.current);
    const work = queue.current
      .catch(() => {})
      .then(async () => {
        if (!eref.current)
          throw new Error("The online workspace is not connected.");
        const snapshot = structuredClone(dref.current);
        await flushArchive();
        if (!confirm && stable(snapshot) === lastSaved.current) {
          dirty.current = false;
          return;
        }
        setSaved(confirm ? "Compiling and saving…" : "Saving online…");
        const remote = await save(snapshot, eref.current.revision, confirm);
        eref.current = remote;
        setEntry(remote);
        lastSaved.current = stable(snapshot);
        if (stable(dref.current) === stable(snapshot)) {
          dirty.current = false;
          if (confirm) current(upgrade(remote.draft));
          setSaved(`Saved online · Revision ${remote.revision}`);
        }
      });
    queue.current = work;
    try {
      await work;
    } catch (e) {
      setSaved("Not saved online");
      setError((e as Error).message);
      throw e;
    }
  }, []);
  const update = (next: SetupV3) => {
    current({ ...next, confirmed: false, confirmedAt: null, compiled: null });
    dirty.current = true;
    setSaved("Saving online…");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist().catch(() => {}), 700);
  };
  const patch = (v: Partial<SetupV3>) => update({ ...dref.current, ...v });
  const mutate = (next: SetupV3) => {
    try {
      update(reconcile(dref.current, next));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const boot = useCallback(async () => {
    setBooting(true);
    setError("");
    try {
      const remote = await (initial.current ??= start());
      initial.current = null;
      if (!mounted.current) return;
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
        if (
          upgraded.roles.length &&
          upgraded.roles.some(
            (r) => r.quote && upgraded.source?.text.includes(r.quote),
          )
        )
          upgraded.generated.constitution = scopeKey(upgraded, "constitution");
      }
      current(upgraded);
      lastSaved.current = stable(remote.draft);
      dirty.current = stable(upgraded) !== lastSaved.current;
      track("workspace.opened", {
        step: upgraded.step,
        revision: remote.revision,
        uiVersion: 3,
      });
      setSaved(`Saved online · Revision ${remote.revision}`);
      setFinished(remote.draft.confirmed);
      setSelected(upgraded.roles[0]?.id ?? "");
      setGroup(upgraded.departments[0]?.id ?? "");
    } catch (e) {
      setError((e as Error).message);
      setSaved("Online workspace unavailable");
    } finally {
      setBooting(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void boot();
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      void flushArchive().catch(() => {});
    };
  }, [boot]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current || hasPendingArchive()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  useEffect(() => {
    if (!busy) return;
    setSeconds(0);
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [busy]);
  const run = async (stage: Stage, instruction = "") => {
    if (busy) return null;
    const preparationStarted = performance.now();
    setBusy(stage);
    setError("");
    try {
      await queue.current.catch(() => {});
      if (dirty.current) await persist();
      await flushArchive();
      if (!eref.current) throw new Error("Connect your workspace first.");
      const reply = await prepare(
        stage,
        eref.current.revision,
        instruction,
        deep,
        Math.round(performance.now() - preparationStarted),
      );
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
      track("ai.suggestion.received", { stage, result: reply.result });
      return data;
    } catch (e) {
      setError((e as Error).message);
      track("ai.error.shown", { stage, message: (e as Error).message });
      return null;
    } finally {
      setBusy(null);
    }
  };
  const source = async (file: File, text?: string) => {
    setReading(true);
    setError("");
    try {
      const content = text ?? (await readConstitution(file)),
        s = await documentSource(content, file.name);
      const manifest = await archiveFile(file);
      patch({ source: { ...s, archiveId: manifest.id } });
      track("document.selected", {
        fileName: file.name,
        chars: s.text.length,
        checksum: s.checksum,
      });
      await persist();
      setPasteOpen(false);
    } catch (e) {
      setError((e as Error).message);
      track("document.read.failed", { message: (e as Error).message });
    } finally {
      setReading(false);
    }
  };
  const next = async () => {
    setError("");
    const d = dref.current;
    try {
      if (d.step === 0) {
        if (
          d.roles.length &&
          d.generated.constitution === scopeKey(d, "constitution")
        ) {
          patch({ step: 1 });
          await persist();
          return;
        }
        const data = await run("constitution");
        if (!data) return;
        const merged = mergeConstitution(
          dref.current,
          data as Parameters<typeof mergeConstitution>[1],
        );
        merged.name = merged.name || (data as { name: string }).name;
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
        await persist();
        return;
      }
      if (d.step === 2) {
        if (!hasReviewedCheck(d)) {
          setSelected("check");
          throw new Error(
            "Complete the Check tab or choose Skip check before continuing.",
          );
        }
        patch({ step: 3 });
        await persist();
        if (!d.memberFlow) {
          const data = await run("member_workflow");
          if (data) {
            patch({
              memberFlow: data as OrgFlow,
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
        if (d.memberFlow.nodes.some((n) => !n.title.trim()))
          throw new Error("Give each workflow step a title.");
        patch({ step: 4 });
        await persist();
        return;
      }
      if (d.step === 4) {
        setBusy("guide");
        await persist(true);
        setFinished(true);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (d.step === 4) setBusy(null);
    }
  };
  const back = async () => {
    patch({ step: Math.max(0, dref.current.step - 1) });
    await persist().catch(() => {});
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
  const editDepartment = (id: string, fields: Partial<Department>) =>
    mutate({
      ...draft,
      departments: draft.departments.map((d) =>
        d.id === id ? { ...d, ...fields, source: "manual" } : d,
      ),
    });
  const removeRole = (id: string) => {
    const role = draft.roles.find((r) => r.id === id);
    if (
      !window.confirm(
        `Remove ${role?.title}? Affected workflow owners will need review. Prior versions remain archived.`,
      )
    )
      return;
    try {
      update(
        applyChanges(draft, [
          {
            entity: "role",
            id,
            operation: "remove",
            field: "title",
            value: null,
          },
        ]),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const send = async (text = chat, riskId?: string) => {
    if (!text.trim() || busy) return;
    patch({
      messages: [
        ...draft.messages.slice(-198),
        { id: uid("message"), role: "user", text: text.trim(), at: now() },
      ],
    });
    setChat("");
    const result = (await run(
      "edit",
      `Current screen: ${STEPS[draft.step]}. Selected item: ${selected || "none"}. Request: ${text}`,
    )) as {
      message: string;
      question: string | null;
      changes: OrgChange[];
    } | null;
    if (!result) return;
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
      } catch (e) {
        setError((e as Error).message);
      }
    }
    await persist().catch(() => {});
  };
  const check = async () => {
    const key = scopeKey(dref.current, "risk_check");
    if (
      dref.current.generated.risk_check === key &&
      dref.current.riskCheck.risks.length
    ) {
      setRiskIndex(0);
      return;
    }
    const result = (await run("risk_check")) as { risks: RiskIssue[] } | null;
    if (!result) return;
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
    await persist().catch(() => {});
  };
  const risk = draft.riskCheck.risks[riskIndex],
    answers = draft.riskCheck.answers;
  const choose = (option: string) => {
    patch({
      riskCheck: {
        ...draft.riskCheck,
        answers: { ...answers, [risk.id]: option },
      },
    });
    setOther("");
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
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const accept = async () => {
    if (!proposal) return;
    try {
      if (proposal.riskId) {
        const optionId = uid("custom_fix");
        patch({
          riskCheck: {
            ...draft.riskCheck,
            risks: draft.riskCheck.risks.map((r) =>
              r.id === proposal.riskId
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
                : r,
            ),
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
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const selectedRole = draft.roles.find((r) => r.id === selected);
  const roleEdit = (role: OrgRole, fields: Partial<OrgRole>) =>
    mutate({
      ...draft,
      roles: draft.roles.map((r) =>
        r.id === role.id
          ? {
              ...r,
              ...fields,
              manualFields: [
                ...new Set([...(r.manualFields ?? []), ...Object.keys(fields)]),
              ],
            }
          : r,
      ),
    });
  const disabled = !!busy || reading || booting || !entry;
  const exportAll = async () => {
    setExporting(true);
    try {
      await persist();
      await exportRecords();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(false);
    }
  };
  if (booting)
    return (
      <div className="os-loading" role="status">
        <span className="os-spinner" />
        Opening your saved workspace…
      </div>
    );
  return (
    <div
      className="os-root v3-root"
      onClickCapture={(e) => {
        const el = (e.target as HTMLElement).closest("button,a,summary");
        if (el)
          track("ui.clicked", {
            screen: STEPS[draft.step],
            text: el.textContent?.slice(0, 160),
          });
      }}
      onChangeCapture={(e) => {
        const t = e.target as HTMLInputElement;
        track("ui.changed", {
          screen: STEPS[draft.step],
          field: t.getAttribute("aria-label") ?? t.name,
          value: t.type === "checkbox" ? t.checked : t.value,
        });
      }}
      onFocusCapture={(e) =>
        track("ui.focused", {
          screen: STEPS[draft.step],
          field: (e.target as HTMLElement).getAttribute("aria-label"),
        })
      }
      onBlurCapture={(e) =>
        track("ui.blurred", {
          screen: STEPS[draft.step],
          field: (e.target as HTMLElement).getAttribute("aria-label"),
        })
      }
    >
      <div className="v3-top">
        <Link to="/phase1">← Home</Link>
        <span className="v3-save" role="status">
          ● {saved}
        </span>
        <button disabled={exporting || !!busy} onClick={() => void exportAll()}>
          {exporting ? "Exporting…" : "Export records"}
        </button>
        <button
          onClick={() =>
            void listArchivedFiles()
              .then((x) => setFiles(x.uploads))
              .catch((e) => setError(e.message))
          }
        >
          Files
        </button>
      </div>
      {error && (
        <div className="os-error" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            ×
          </button>
          {!entry && <button onClick={() => void boot()}>Reconnect</button>}
        </div>
      )}
      {finished ? (
        <div className="v3-complete">
          <span>✓</span>
          <h1>Your organization is ready.</h1>
          <p>
            Your confirmed settings and structured AI configuration are saved
            online. Previous versions remain in your records.
          </p>
          <button
            onClick={() => {
              setFinished(false);
              setReviewTab("team");
            }}
          >
            Review settings
          </button>
          <Link to="/phase1">Go to workspace →</Link>
        </div>
      ) : (
        <>
          <nav
            tabIndex={0}
            className="v3-progress"
            aria-label="Organization setup progress"
          >
            {STEPS.map((s, i) => (
              <span
                key={s}
                aria-current={i === draft.step ? "step" : undefined}
              >
                <b>{i < draft.step ? "✓" : i + 1}</b>
                {s}
              </span>
            ))}
          </nav>
          <header className="v3-heading">
            <p>YOUR ORGANIZATION, UNDERSTOOD</p>
            <h1>{HEADINGS[draft.step]}</h1>
            <p>{PURPOSE[draft.step]}</p>
          </header>
          <div
            className={`v3-layout ${draft.step === 0 ? "v3-source-layout" : ""}`}
          >
            <section className="v3-main">
              <fieldset disabled={disabled}>
                {draft.step === 0 && (
                  <div className="v3-source-panel">
                    <label>
                      Organization name
                      <input
                        aria-label="Organization name"
                        maxLength={100}
                        value={draft.name}
                        onChange={(e) => patch({ name: e.target.value })}
                      />
                    </label>
                    <div className="v3-upload">
                      <span>▤</span>
                      <h2>Your existing constitution is the starting point.</h2>
                      <p>PDF, Word (.docx), or text · Up to 8 MB</p>
                      <label className="v3-upload-button">
                        Upload constitution
                        <input
                          aria-label="Upload constitution"
                          type="file"
                          accept=".pdf,.docx,.txt,.md"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void source(file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <div className="v3-source-options">
                        <button
                          onClick={() =>
                            void source(
                              new File(
                                [EXAMPLE_CONSTITUTION],
                                "fictional-constitution.txt",
                                { type: "text/plain" },
                              ),
                              EXAMPLE_CONSTITUTION,
                            )
                          }
                        >
                          Use fictional example
                        </button>
                        <button onClick={() => setPasteOpen(true)}>
                          Paste text
                        </button>
                      </div>
                    </div>
                    {reading && (
                      <p role="status">Reading and archiving your document…</p>
                    )}
                    {draft.source && (
                      <div className="v3-file">
                        <b>✓ {draft.source.fileName}</b>
                        <span>
                          {draft.source.text.length.toLocaleString()} characters
                          · Original archived
                        </span>
                        <button onClick={() => patch({ source: null })}>
                          Remove source
                        </button>
                      </div>
                    )}
                    <p className="v3-note">
                      No constitution? AI can suggest a starting team for you to
                      review. Only use fictional data in this prototype.
                    </p>
                  </div>
                )}
                {draft.step === 1 && (
                  <>
                    <div className="v3-toolbar">
                      <div
                        className="v3-tabs"
                        role="tablist"
                        aria-label="Team setup"
                      >
                        <button
                          role="tab"
                          aria-selected={teamTab === "departments"}
                          onClick={() => setTeamTab("departments")}
                        >
                          Departments
                        </button>
                        <button
                          role="tab"
                          aria-selected={teamTab === "chart"}
                          onClick={() => setTeamTab("chart")}
                        >
                          Organization chart
                        </button>
                      </div>
                      <button
                        className="v3-accent"
                        onClick={() => {
                          setRoleDept(draft.departments[0]?.id ?? "");
                          setNewRole(true);
                        }}
                      >
                        + Add a custom role
                      </button>
                    </div>
                    {teamTab === "departments" ? (
                      <>
                        <div className="v3-departments">
                          {draft.departments.map((dep) => (
                            <div className="v3-department" key={dep.id}>
                              <input
                                type="color"
                                aria-label={`Color for ${dep.name}`}
                                value={dep.color}
                                onChange={(e) =>
                                  editDepartment(dep.id, {
                                    color: e.target.value,
                                  })
                                }
                              />
                              <input
                                aria-label={`Department name ${dep.id}`}
                                value={dep.name}
                                maxLength={180}
                                onChange={(e) =>
                                  editDepartment(dep.id, {
                                    name: e.target.value,
                                  })
                                }
                              />
                              <span>
                                {dep.source === "constitution"
                                  ? "From constitution"
                                  : dep.source === "manual"
                                    ? "Edited by you"
                                    : "Suggested from duties"}{" "}
                                ·{" "}
                                {
                                  draft.roles.filter(
                                    (r) => r.departmentId === dep.id,
                                  ).length
                                }{" "}
                                roles
                              </span>
                              <button
                                aria-label={`Remove department ${dep.name}`}
                                disabled={draft.roles.some(
                                  (r) => r.departmentId === dep.id,
                                )}
                                title="Move its roles before removing this department"
                                onClick={() =>
                                  patch({
                                    departments: draft.departments.filter(
                                      (d) => d.id !== dep.id,
                                    ),
                                  })
                                }
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="v3-toolbar">
                          <button onClick={addDepartment}>
                            + Add department
                          </button>
                          <button
                            className="v3-primary"
                            onClick={() => setTeamTab("chart")}
                          >
                            Review organization chart →
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="v3-chart-toolbar">
                          <span>
                            Drag a role onto another to change its reporting
                            line, or connect their dots.
                          </span>
                          <button
                            onClick={() =>
                              patch({ roles: arrangeTeam(draft.roles) })
                            }
                          >
                            Arrange
                          </button>
                        </div>
                        <TeamChart
                          roles={draft.roles}
                          departments={draft.departments}
                          onChange={(roles) => {
                            track("team.chart.changed", { roles });
                            mutate({ ...draft, roles });
                          }}
                          onRemove={removeRole}
                          onSelect={setSelected}
                          onError={setError}
                        />
                      </>
                    )}
                  </>
                )}
                {draft.step === 2 && (
                  <div className="v3-responsibility">
                    <div
                      className="v3-tabs v3-dept-tabs"
                      role="tablist"
                      aria-label="Responsibility departments"
                    >
                      {draft.departments.map((dep) => (
                        <button
                          key={dep.id}
                          role="tab"
                          aria-selected={
                            group === dep.id && selected !== "check"
                          }
                          style={{ borderBottomColor: dep.color }}
                          onClick={() => {
                            setGroup(dep.id);
                            setSelected(
                              draft.roles.find((r) => r.departmentId === dep.id)
                                ?.id ?? "",
                            );
                          }}
                        >
                          {dep.name}
                        </button>
                      ))}
                      <button
                        role="tab"
                        aria-selected={selected === "check"}
                        onClick={() => setSelected("check")}
                      >
                        ✓ Check
                      </button>
                    </div>
                    {selected !== "check" ? (
                      <>
                        <div
                          className="v3-tabs v3-role-tabs"
                          role="tablist"
                          aria-label="Positions"
                        >
                          {draft.roles
                            .filter((r) => r.departmentId === group)
                            .map((r) => (
                              <button
                                role="tab"
                                aria-selected={selected === r.id}
                                key={r.id}
                                onClick={() => setSelected(r.id)}
                              >
                                {r.title}
                              </button>
                            ))}
                        </div>
                        {selectedRole ? (
                          <div className="v3-duties">
                            <h2
                              style={{
                                borderLeftColor: draft.departments.find(
                                  (d) => d.id === selectedRole.departmentId,
                                )?.color,
                              }}
                            >
                              {selectedRole.title}
                            </h2>
                            <ul>
                              {selectedRole.responsibilities.map((duty, i) => (
                                <li key={i}>
                                  <span>•</span>
                                  <input
                                    aria-label={`Duty ${i + 1} for ${selectedRole.title}`}
                                    value={duty}
                                    maxLength={240}
                                    onChange={(e) =>
                                      roleEdit(selectedRole, {
                                        responsibilities:
                                          selectedRole.responsibilities.map(
                                            (x, n) =>
                                              n === i ? e.target.value : x,
                                          ),
                                      })
                                    }
                                  />
                                  <button
                                    aria-label={`Remove duty ${i + 1}`}
                                    onClick={() =>
                                      roleEdit(selectedRole, {
                                        responsibilities:
                                          selectedRole.responsibilities.filter(
                                            (_, n) => n !== i,
                                          ),
                                      })
                                    }
                                  >
                                    ×
                                  </button>
                                </li>
                              ))}
                            </ul>
                            <button
                              disabled={
                                selectedRole.responsibilities.length >= 12
                              }
                              onClick={() =>
                                roleEdit(selectedRole, {
                                  responsibilities: [
                                    ...selectedRole.responsibilities,
                                    "",
                                  ],
                                })
                              }
                            >
                              + Add responsibility
                            </button>
                            <div className="v3-duty-next">
                              <button
                                className="v3-primary"
                                onClick={() => {
                                  const index = draft.roles.findIndex(
                                    (r) => r.id === selected,
                                  );
                                  const nextRole = draft.roles[index + 1];
                                  setSelected(nextRole?.id ?? "check");
                                  if (nextRole) setGroup(nextRole.departmentId);
                                }}
                              >
                                Next position →
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p>No roles in this department yet.</p>
                        )}
                      </>
                    ) : (
                      <div className="v3-check">
                        <h2>Check the important gaps.</h2>
                        <p>
                          AI checks for major missing responsibilities, unclear
                          ownership, or conflicting authority. Ordinary shared
                          work is fine.
                        </p>
                        {hasReviewedCheck(draft) ? (
                          <div className="v3-check-done">
                            <b>
                              ✓{" "}
                              {draft.riskCheck.status === "skipped"
                                ? "Check skipped by you."
                                : "Responsibility review complete."}
                            </b>
                            <button
                              onClick={() => {
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
                              }}
                            >
                              Review again
                            </button>
                          </div>
                        ) : draft.generated.risk_check ===
                            scopeKey(draft, "risk_check") &&
                          draft.riskCheck.risks.length ? (
                          <>
                            <div className="v3-flashcard">
                              <small>
                                QUESTION {riskIndex + 1} OF{" "}
                                {draft.riskCheck.risks.length}
                              </small>
                              <h3>{risk?.title}</h3>
                              <p>{risk?.explanation}</p>
                              <div className="v3-risk-options">
                                {risk?.options.map((o) => (
                                  <button
                                    key={o.id}
                                    aria-pressed={answers[risk.id] === o.id}
                                    onClick={() => choose(o.id)}
                                  >
                                    {o.label}
                                  </button>
                                ))}
                              </div>
                              <label>
                                Other / Give specific instructions
                                <textarea
                                  aria-label="Custom risk instruction"
                                  value={other}
                                  onChange={(e) => setOther(e.target.value)}
                                  maxLength={1000}
                                />
                              </label>
                              <button
                                disabled={!other.trim()}
                                onClick={() =>
                                  void send(
                                    `For risk "${risk.title}": ${other}. Propose a focused fix to these role duties.`,
                                    risk.id,
                                  )
                                }
                              >
                                Ask AI for this fix
                              </button>
                            </div>
                            <div className="v3-toolbar">
                              <button
                                disabled={riskIndex === 0}
                                onClick={() => setRiskIndex(riskIndex - 1)}
                              >
                                Previous question
                              </button>
                              {riskIndex < draft.riskCheck.risks.length - 1 && (
                                <button
                                  onClick={() => setRiskIndex(riskIndex + 1)}
                                >
                                  Next question
                                </button>
                              )}
                              <button
                                className="v3-primary"
                                disabled={draft.riskCheck.risks.some(
                                  (r) => !answers[r.id],
                                )}
                                onClick={reviewFixes}
                              >
                                Review selected fixes
                              </button>
                            </div>
                          </>
                        ) : (
                          <button
                            className="v3-primary"
                            onClick={() => void check()}
                          >
                            Check responsibilities with AI
                          </button>
                        )}
                        {!hasReviewedCheck(draft) && (
                          <button
                            className="v3-skip"
                            onClick={() => {
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
                            }}
                          >
                            Skip check for now
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {draft.step === 3 && (
                  <>
                    <div className="v3-legend">
                      {draft.departments.map((dep) => (
                        <span key={dep.id}>
                          <i style={{ background: dep.color }} />
                          {dep.name}
                        </span>
                      ))}
                    </div>
                    {draft.memberFlow ? (
                      <>
                        <h2 className="v3-flow-title">
                          {draft.memberFlow.title}
                        </h2>
                        <ActivityChart
                          flow={draft.memberFlow}
                          roles={draft.roles}
                          departments={draft.departments}
                          onChange={(memberFlow) => {
                            track("workflow.changed", { memberFlow });
                            patch({ memberFlow });
                          }}
                          onError={setError}
                        />
                        <p className="v3-note">
                          Parallel branches can run together. “After either”
                          joins alternative entry points; “After all” waits for
                          every prerequisite. Open owners inside a node to
                          adjust them.
                        </p>
                      </>
                    ) : (
                      <div className="v3-empty">
                        <p>
                          Your saved roles and responsibilities are ready.
                          Prepare the activity workflow when you are ready.
                        </p>
                        <button
                          className="v3-primary"
                          onClick={() =>
                            void run("member_workflow").then((data) => {
                              if (data) {
                                patch({ memberFlow: data as OrgFlow });
                                void persist();
                              }
                            })
                          }
                        >
                          Prepare activity workflow
                        </button>
                      </div>
                    )}
                  </>
                )}
                {draft.step === 4 && (
                  <>
                    <div
                      className="v3-tabs"
                      role="tablist"
                      aria-label="Review settings"
                    >
                      {[
                        ["team", "Team"],
                        ["duties", "Responsibilities"],
                        ["workflow", "Activity workflow"],
                      ].map(([id, label]) => (
                        <button
                          key={id}
                          role="tab"
                          aria-selected={reviewTab === id}
                          onClick={() => setReviewTab(id)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {reviewTab === "team" && (
                      <>
                        <h2>{draft.name}</h2>
                        {draft.mission && <p>{draft.mission}</p>}
                        <table className="v3-table">
                          <thead>
                            <tr>
                              <th>Department</th>
                              <th>Position</th>
                              <th>Reports to</th>
                            </tr>
                          </thead>
                          <tbody>
                            {draft.roles.map((r) => (
                              <tr key={r.id}>
                                <td>
                                  <i
                                    style={{
                                      background: draft.departments.find(
                                        (d) => d.id === r.departmentId,
                                      )?.color,
                                    }}
                                  />
                                  {
                                    draft.departments.find(
                                      (d) => d.id === r.departmentId,
                                    )?.name
                                  }
                                </td>
                                <td>{r.title}</td>
                                <td>
                                  {draft.roles.find(
                                    (x) => x.id === r.parentRoleId,
                                  )?.title ?? "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    )}
                    {reviewTab === "duties" &&
                      draft.roles.map((r) => (
                        <div key={r.id} className="v3-review-duties">
                          <h3>{r.title}</h3>
                          <ul>
                            {r.responsibilities.map((x, i) => (
                              <li key={i}>{x}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    {reviewTab === "workflow" && draft.memberFlow && (
                      <ActivityChart
                        flow={draft.memberFlow}
                        roles={draft.roles}
                        departments={draft.departments}
                        onChange={(memberFlow) => {
                          track("workflow.changed", { memberFlow });
                          patch({ memberFlow });
                        }}
                        onError={setError}
                      />
                    )}
                  </>
                )}
              </fieldset>
              {busy && (
                <div className="v3-busy" role="status">
                  <span className="os-spinner" />
                  <div>
                    <b>
                      {busy === "constitution"
                        ? "Reading your constitution"
                        : busy === "risk_check"
                          ? "Checking major responsibility risks"
                          : busy === "edit"
                            ? "Preparing a change for your approval"
                            : busy === "guide"
                              ? "Compiling and saving your organization"
                              : "Preparing your activity workflow"}
                      …
                    </b>
                    <p>{seconds}s · Your saved settings stay safe.</p>
                  </div>
                </div>
              )}
              <div className="v3-footer">
                <button
                  disabled={disabled || draft.step === 0}
                  onClick={() => void back()}
                >
                  ← Back
                </button>
                <span>Saved as you review</span>
                <button
                  className="v3-primary"
                  disabled={
                    disabled || (draft.step === 2 && !hasReviewedCheck(draft))
                  }
                  onClick={() => void next()}
                >
                  {draft.step === 0
                    ? draft.roles.length &&
                      draft.generated.constitution ===
                        scopeKey(draft, "constitution")
                      ? "Continue to your team"
                      : "Let AI prepare my team"
                    : draft.step === 4
                      ? "Confirm organization"
                      : "Approve & continue"}
                </button>
              </div>
            </section>
            {draft.step > 0 && (
              <aside className="v3-assistant">
                <div className="v3-assistant-title">
                  <span>✦</span>
                  <div>
                    <b>Ask Platypus</b>
                    <small>{STEPS[draft.step]} · Connected to your setup</small>
                  </div>
                </div>
                <p className="v3-note">
                  Tell me what to adjust. I’ll show you the proposed changes
                  before applying them.
                </p>
                <div className="v3-messages" aria-live="polite">
                  {draft.messages.length ? (
                    draft.messages.slice(-12).map((m) => (
                      <div key={m.id} className={`v3-message v3-${m.role}`}>
                        <small>{m.role === "user" ? "You" : "Platypus"}</small>
                        <p>{m.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="v3-chat-examples">
                      {(draft.step === 1
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
                            ]
                      ).map((x) => (
                        <button
                          key={x}
                          disabled={disabled}
                          onClick={() => setChat(x)}
                        >
                          {x}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send();
                  }}
                >
                  <textarea
                    aria-label="Ask Platypus about this setup"
                    placeholder="Describe a change…"
                    value={chat}
                    onChange={(e) => setChat(e.target.value)}
                    disabled={disabled}
                    maxLength={1200}
                  />
                  <div className="v3-chat-controls">
                    <label>
                      <input
                        type="checkbox"
                        checked={deep}
                        onChange={(e) => setDeep(e.target.checked)}
                        disabled={disabled}
                      />
                      Deeper review (slower)
                    </label>
                    <button
                      className="v3-primary"
                      disabled={disabled || !chat.trim()}
                    >
                      Send →
                    </button>
                  </div>
                </form>
              </aside>
            )}
          </div>
        </>
      )}
      <div className="v3-bottom">
        <span>Timestamped records · Private test workspace</span>
        <Link to="/phase1/setup-legacy">Previous setup reference</Link>
      </div>
      {pasteOpen && (
        <Dialog
          title="Paste constitution text"
          close={() => setPasteOpen(false)}
        >
          <label>
            Constitution text
            <textarea
              aria-label="Constitution text"
              rows={12}
              maxLength={60000}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
            />
          </label>
          <button
            className="v3-primary"
            disabled={reading || paste.trim().length < 20}
            onClick={() =>
              void source(
                new File([paste], "pasted-constitution.txt", {
                  type: "text/plain",
                }),
                paste,
              )
            }
          >
            Use this text
          </button>
        </Dialog>
      )}
      {newRole && (
        <Dialog title="Add a custom role" close={() => setNewRole(false)}>
          <label>
            Role title
            <input
              aria-label="Custom role title"
              value={roleTitle}
              maxLength={180}
              onChange={(e) => setRoleTitle(e.target.value)}
            />
          </label>
          <label>
            Department
            <select
              aria-label="Custom role department"
              value={roleDept}
              onChange={(e) => setRoleDept(e.target.value)}
            >
              {draft.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="v3-primary"
            disabled={!roleTitle.trim() || !roleDept}
            onClick={() => {
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
                    position: { x: 0, y: 0 },
                    manualFields: ["title", "departmentId"],
                  },
                ],
              });
              setRoleTitle("");
              setNewRole(false);
              setTeamTab("chart");
              setSelected(id);
            }}
          >
            Add role
          </button>
        </Dialog>
      )}
      {proposal && (
        <Dialog
          title="Review proposed changes"
          close={() => {
            track("ai.proposal.closed", { changes: proposal.changes });
            setProposal(null);
          }}
        >
          <p>{proposal.message}</p>
          <div className="v3-change-list">
            {proposal.changes.map((c, i) => {
              const before =
                c.entity === "role"
                  ? draft.roles.find((x) => x.id === c.id)
                  : c.entity === "department"
                    ? draft.departments.find((x) => x.id === c.id)
                    : draft.memberFlow?.nodes.find((x) => x.id === c.id);
              const after =
                c.entity === "role"
                  ? proposal.after.roles.find((x) => x.id === c.id)
                  : c.entity === "department"
                    ? proposal.after.departments.find((x) => x.id === c.id)
                    : proposal.after.memberFlow?.nodes.find(
                        (x) => x.id === c.id,
                      );
              const old = before
                ? (before as unknown as Record<string, unknown>)[c.field]
                : undefined;
              const nextValue = after
                ? (after as unknown as Record<string, unknown>)[c.field]
                : undefined;
              return (
                <div key={i}>
                  <b>
                    {c.entity} ·{" "}
                    {"title" in (before ?? {})
                      ? (before as OrgRole).title
                      : c.id}{" "}
                    · {c.field}
                  </b>
                  <div className="v3-before-after">
                    <div>
                      <small>Current</small>
                      <p>
                        {Array.isArray(old)
                          ? old.join(" • ")
                          : String(old ?? "—")}
                      </p>
                    </div>
                    <div>
                      <small>Proposed</small>
                      <p>
                        {c.operation === "remove"
                          ? "Remove"
                          : Array.isArray(nextValue)
                            ? nextValue.join(" • ")
                            : String(nextValue ?? "—")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="v3-toolbar">
            <button
              onClick={() => {
                track("ai.proposal.discarded", { changes: proposal.changes });
                setProposal(null);
              }}
            >
              Keep current settings
            </button>
            <button
              className="v3-primary"
              disabled={!!busy}
              onClick={() => void accept()}
            >
              Approve changes
            </button>
          </div>
        </Dialog>
      )}
      {files && (
        <Dialog title="Archived original files" close={() => setFiles(null)}>
          {files.length ? (
            files.map((f) => (
              <div className="v3-file" key={f.id}>
                <b>{f.fileName}</b>
                <span>{f.createdAt}</span>
                <button
                  onClick={() =>
                    void downloadOriginal(f.id).catch((e) =>
                      setError(e.message),
                    )
                  }
                >
                  Download original
                </button>
              </div>
            ))
          ) : (
            <p>No original files yet.</p>
          )}
        </Dialog>
      )}
    </div>
  );
}
