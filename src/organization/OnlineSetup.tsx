import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  DEPARTMENTS,
  type Envelope,
  type OrgFlow,
  type OrgRole,
  type SetupDraft,
  type Stage,
} from "./schema";
import { blankDraft, EXAMPLE_CONSTITUTION, presetAssignments } from "./presets";
import { start, save, prepare } from "./client";
import { documentSource, readConstitution } from "./documents";
import { PROMPTS, PROMPT_VERSION } from "./prompts";
import FlowEditor from "./FlowEditor";
import "./organization.css";
const STEPS = [
  "Constitution",
  "Your team",
  "Responsibilities",
  "Member programs",
  "Board work",
  "Review",
];
const STAGE_TITLES: Record<Stage, string> = {
  constitution: "Reading the constitution and finding roles",
  responsibilities: "Preparing responsibilities for your team",
  member_workflow: "Building your member program workflow",
  board_workflow: "Organizing your executive board workflow",
  guide: "Preparing the organization guide for future AI calls",
};
const purpose = [
  "Platypus reads what you already have so it can propose how your team works. You review the result.",
  "Confirm the roles Platypus found. These titles guide the next responsibility suggestions.",
  "AI has prepared a starting point. Check every role that does each piece of work.",
  "Review how an opportunity becomes a member program. Adjust the chain to match your team’s habits.",
  "Your board also has its own work. Describe a goal and let Platypus organize the moving parts.",
  "Confirm the organization understanding that will guide future requests.",
];
function PromptReview({ stage }: { stage: Stage }) {
  return (
    <details className="os-prompt">
      <summary>How this AI step works · View prompt</summary>
      <p>
        Reads your current organization context, preserves your choices, and
        returns a structured suggestion for review.
      </p>
      <span className="os-metadata">
        {PROMPT_VERSION} · {PROMPTS[stage].title}
      </span>
      <pre tabIndex={0}>{PROMPTS[stage].system}</pre>
    </details>
  );
}
function Spinner({ label }: { label: string }) {
  return (
    <div className="os-loading" role="status" aria-live="polite">
      <span className="os-spinner" />
      <div>
        <b>{label}</b>
        <p>Preparing a suggestion for you to review.</p>
      </div>
    </div>
  );
}
function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className="os-dialog" onCancel={onClose}>
      <div className="os-section-heading">
        <h2>{title}</h2>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function OnlineSetup() {
  const [draft, setDraft] = useState<SetupDraft>(blankDraft),
    [entry, setEntry] = useState<Envelope | null>(null),
    [booting, setBooting] = useState(true),
    [error, setError] = useState(""),
    [saved, setSaved] = useState("Connecting to online workspace…"),
    [busy, setBusy] = useState<Stage | null>(null),
    [reading, setReading] = useState(false),
    [pasteOpen, setPasteOpen] = useState(false),
    [paste, setPaste] = useState(""),
    [newRole, setNewRole] = useState(""),
    [department, setDepartment] = useState("planning"),
    [editInstruction, setEditInstruction] = useState(""),
    [proposal, setProposal] = useState<{
      stage: "member_workflow" | "board_workflow";
      flow: OrgFlow;
    } | null>(null),
    [showPrompts, setShowPrompts] = useState(false),
    [finished, setFinished] = useState(false);
  const dref = useRef(draft),
    eref = useRef<Envelope | null>(null),
    dirty = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout>>(),
    queue = useRef<Promise<void>>(Promise.resolve()),
    mounted = useRef(true);
  const setCurrent = (d: SetupDraft) => {
    dref.current = d;
    setDraft(d);
  };
  const persist = useCallback(async (confirm = false) => {
    if (timer.current) clearTimeout(timer.current);
    const snapshot = structuredClone(dref.current);
    const work = queue.current
      .catch(() => {})
      .then(async () => {
        if (!eref.current)
          throw new Error("The online workspace is not connected.");
        setSaved("Saving online…");
        const next = await save(snapshot, eref.current.revision, confirm);
        eref.current = next;
        setEntry(next);
        if (JSON.stringify(dref.current) === JSON.stringify(snapshot)) {
          dirty.current = false;
          if (confirm) setCurrent(next.draft);
          setSaved(`Saved online · Revision ${next.revision}`);
        } else setSaved("Saving latest changes…");
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
  const update = (next: SetupDraft) => {
    setCurrent({
      ...next,
      confirmed: false,
      guide: next.step < 5 ? null : next.guide,
    });
    dirty.current = true;
    setSaved("Saving online…");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void persist().catch(() => {});
    }, 700);
  };
  const patch = (v: Partial<SetupDraft>) => update({ ...dref.current, ...v });
  const boot = useCallback(async () => {
    setBooting(true);
    setError("");
    try {
      const remote = await start();
      if (!mounted.current) return;
      eref.current = remote;
      setEntry(remote);
      setCurrent(remote.draft);
      setSaved(`Saved online · Revision ${remote.revision}`);
      setFinished(remote.draft.confirmed);
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
    };
  }, [boot]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  const run = async (stage: Stage, instruction = "", previewOnly = false) => {
    setBusy(stage);
    setError("");
    try {
      if (timer.current) clearTimeout(timer.current);
      await queue.current.catch(() => {});
      if (dirty.current) await persist();
      if (!eref.current)
        throw new Error("The online workspace is not connected.");
      const reply = await prepare(stage, eref.current.revision, instruction);
      eref.current = {
        ...eref.current,
        revision: reply.revision,
        updatedAt: reply.updatedAt,
      };
      setEntry(eref.current);
      const result = reply.result;
      const { data: _data, ...runMeta } = result;
      let next = {
        ...dref.current,
        aiRuns: [...dref.current.aiRuns.slice(-49), runMeta],
      };
      const data = result.data as Record<string, unknown>;
      if (stage === "constitution") {
        const roles = data.roles as OrgRole[];
        next = {
          ...next,
          name:
            typeof data.name === "string" && data.name ? data.name : next.name,
          mission: String(data.mission ?? ""),
          summary: String(data.summary ?? ""),
          roles,
          assignments: (data.assignments as SetupDraft["assignments"])?.length
            ? (data.assignments as SetupDraft["assignments"])
            : presetAssignments(roles),
          uncertainties: (data.uncertainties as string[]) ?? [],
          step: 1,
          approvals: { constitution: true },
          memberFlow: null,
          boardFlow: null,
          guide: null,
        };
      } else if (stage === "responsibilities") {
        const aiRows = data.assignments as SetupDraft["assignments"];
        next = {
          ...next,
          assignments: next.actions.map(
            (a) =>
              next.assignments.find(
                (r) => r.actionId === a.id && r.origin === "manual",
              ) ??
              aiRows.find((r) => r.actionId === a.id) ?? {
                actionId: a.id,
                roleIds: [],
                origin: "ai",
                confirmed: false,
              },
          ),
          summary: String(data.summary ?? next.summary),
          uncertainties: (data.uncertainties as string[]) ?? [],
          step: 2,
          approvals: { ...next.approvals, roles: true },
          memberFlow: null,
          boardFlow: null,
        };
      } else if (stage === "member_workflow" || stage === "board_workflow") {
        if (previewOnly) {
          setProposal({ stage, flow: result.data as OrgFlow });
          setCurrent(next);
          dirty.current = true;
          await persist();
          return;
        }
        next = {
          ...next,
          [stage === "member_workflow" ? "memberFlow" : "boardFlow"]:
            result.data as OrgFlow,
          step: stage === "member_workflow" ? 3 : 4,
          approvals: {
            ...next.approvals,
            [stage === "member_workflow" ? "responsibilities" : "member"]: true,
          },
        };
      } else
        next = {
          ...next,
          guide: result.data as SetupDraft["guide"],
          step: 5,
          approvals: { ...next.approvals, board: true },
        };
      setCurrent(next);
      dirty.current = true;
      await persist();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const advance = async () => {
    if (draft.step === 0) {
      if (!draft.name.trim()) {
        setError("Give your organization a name.");
        return;
      }
      await run("constitution");
      return;
    }
    if (draft.step === 1) {
      if (
        draft.roles.some((r) => !r.title.trim()) ||
        new Set(draft.roles.map((r) => r.title.trim().toLowerCase())).size !==
          draft.roles.length
      ) {
        setError("Give every role a distinct title.");
        return;
      }
      patch({ approvals: { ...draft.approvals, roles: true } });
      await run("responsibilities");
      return;
    }
    if (draft.step === 2) {
      patch({ approvals: { ...draft.approvals, responsibilities: true } });
      await run("member_workflow");
      return;
    }
    if (draft.step === 3) {
      patch({ approvals: { ...draft.approvals, member: true } });
      await run("board_workflow");
      return;
    }
    if (draft.step === 4) {
      patch({ approvals: { ...draft.approvals, board: true } });
      await run("guide");
      return;
    }
    try {
      setBusy("guide");
      setError("");
      await persist(true);
      setFinished(true);
    } catch {
      /* error already displayed */
    } finally {
      setBusy(null);
    }
  };
  async function source(text: string, name: string) {
    setReading(true);
    setError("");
    try {
      const document = await documentSource(text, name);
      patch({
        source: document,
        approvals: {},
        roles: [],
        assignments: [],
        memberFlow: null,
        boardFlow: null,
        guide: null,
      });
      await persist();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReading(false);
    }
  }
  const toggle = (actionId: string, roleId: string, checked: boolean) => {
    const old = draft.assignments.find((r) => r.actionId === actionId);
    const ids = new Set(old?.roleIds ?? []);
    checked ? ids.add(roleId) : ids.delete(roleId);
    patch({
      assignments: [
        ...draft.assignments.filter((r) => r.actionId !== actionId),
        { actionId, roleIds: [...ids], origin: "manual", confirmed: true },
      ],
      approvals: {
        ...draft.approvals,
        responsibilities: false,
        member: false,
        board: false,
      },
    });
  };
  const stage: Stage = (
    [
      "constitution",
      "constitution",
      "responsibilities",
      "member_workflow",
      "board_workflow",
      "guide",
    ] as Stage[]
  )[draft.step];
  if (booting)
    return (
      <div className="os">
        <Spinner label="Opening your online organization workspace" />
      </div>
    );
  if (!entry)
    return (
      <div className="os">
        <h1>Organization setup</h1>
        <p>
          Platypus needs an online workspace to save each change and prepare AI
          suggestions.
        </p>
        <p className="os-error" role="alert">
          {error}
        </p>
        <button className="os-primary" onClick={() => void boot()}>
          Reconnect online workspace
        </button>
        <Link to="/phase1/setup-legacy">Open the previous prototype</Link>
      </div>
    );
  return (
    <div className="os">
      <div className="os-meta">
        <Link to="/phase1">← Home</Link>
        <span
          role="status"
          className={saved.startsWith("Not") ? "os-unsaved" : ""}
        >
          {saved}
        </span>
      </div>
      <div className="os-progress" aria-label="Organization setup progress">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={i <= draft.step ? "current" : ""}
            aria-current={i === draft.step ? "step" : undefined}
          >
            <i>{i < draft.step ? "✓" : i + 1}</i>
            <b>{s}</b>
          </span>
        ))}
      </div>
      <header className="os-heading">
        <span className="os-eyebrow">YOUR ORGANIZATION, UNDERSTOOD</span>
        <h1>
          {finished
            ? "Your organization is ready."
            : [
                "Start with your constitution.",
                "Does this look like your team?",
                "A shared picture of who does what.",
                "From opportunity to a great program.",
                "A little structure for board work.",
                "Ready to work together.",
              ][draft.step]}
        </h1>
        <p>
          {finished
            ? "Your confirmed organization guide is saved online. You can return to refine it."
            : purpose[draft.step]}
        </p>
      </header>
      {busy && <Spinner label={STAGE_TITLES[busy]} />}
      <fieldset
        className="os-content"
        disabled={!!busy || reading}
        aria-busy={!!busy || reading}
      >
        {draft.step === 0 && (
          <>
            <label className="os-field">
              Organization name
              <input
                value={draft.name}
                maxLength={100}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </label>
            <div className="os-source-choice">
              <span className="os-document-icon">▤</span>
              <h2>A head start from what you already have</h2>
              <p>
                Upload a fictional constitution. Platypus will suggest your team
                and responsibilities.
              </p>
              <label className="os-upload-button">
                Upload PDF or Word
                <input
                  type="file"
                  aria-label="Upload constitution"
                  accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    setReading(true);
                    setError("");
                    try {
                      const text = await readConstitution(f);
                      await source(text, f.name);
                    } catch (err) {
                      setError((err as Error).message);
                    } finally {
                      setReading(false);
                    }
                  }}
                />
              </label>
              <div className="os-source-alternatives">
                <button
                  onClick={() =>
                    void source(
                      EXAMPLE_CONSTITUTION,
                      "fictional-constitution.txt",
                    )
                  }
                >
                  Use fictional example
                </button>
                <button onClick={() => setPasteOpen(!pasteOpen)}>
                  Paste text
                </button>
              </div>
              <span className="os-hint">
                PDF · Word (.docx) · text · Up to 8 MB
              </span>
            </div>
            {reading && <Spinner label="Reading the document" />}
            {pasteOpen && (
              <div className="os-paste">
                <label>
                  Constitution text
                  <textarea
                    value={paste}
                    maxLength={60000}
                    rows={7}
                    onChange={(e) => setPaste(e.target.value)}
                    placeholder="Paste the constitution text here…"
                  />
                </label>
                <button
                  disabled={paste.trim().length < 20}
                  onClick={() =>
                    void source(paste.trim(), "pasted-constitution.txt")
                  }
                >
                  Use this text
                </button>
              </div>
            )}
            {draft.source && (
              <div className="os-source-ready">
                <span>✓</span>
                <div>
                  <b>{draft.source.fileName}</b>
                  <p>
                    {draft.source.text.length.toLocaleString()} characters ready
                    for AI review
                  </p>
                </div>
                <button onClick={() => patch({ source: null })}>Remove</button>
              </div>
            )}
            <p className="os-hint">
              No constitution yet? Continue and review suggested starting roles
              instead.
            </p>
          </>
        )}
        {draft.step === 1 && (
          <>
            <div className="os-ai-note">
              <span>✦</span>
              <p>
                {draft.summary ||
                  "Review these role suggestions before Platypus prepares the responsibility matrix."}
              </p>
            </div>
            {DEPARTMENTS.filter((dep) =>
              draft.roles.some((r) => r.departmentId === dep.id),
            ).map((dep) => (
              <section className="os-department" key={dep.id}>
                <h2>{dep.name}</h2>
                <div className="os-role-grid">
                  {draft.roles
                    .filter((r) => r.departmentId === dep.id)
                    .map((r) => (
                      <article className="os-role-card" key={r.id}>
                        <div className="os-section-heading">
                          <span className="os-role-origin">
                            {r.source === "constitution"
                              ? "From your constitution"
                              : r.source === "manual"
                                ? "Your edit"
                                : "Suggested starting role"}
                          </span>
                          <button
                            aria-label={`Remove ${r.title}`}
                            onClick={() =>
                              patch({
                                roles: draft.roles.filter((x) => x.id !== r.id),
                                assignments: draft.assignments.map((a) => ({
                                  ...a,
                                  roleIds: a.roleIds.filter(
                                    (id) => id !== r.id,
                                  ),
                                })),
                              })
                            }
                          >
                            Remove
                          </button>
                        </div>
                        <label className="os-sr" htmlFor={`org-role-${r.id}`}>
                          Role title {r.id}
                        </label>
                        <input
                          id={`org-role-${r.id}`}
                          value={r.title}
                          maxLength={180}
                          onChange={(e) =>
                            patch({
                              roles: draft.roles.map((x) =>
                                x.id === r.id
                                  ? {
                                      ...x,
                                      title: e.target.value,
                                      source: "manual",
                                    }
                                  : x,
                              ),
                            })
                          }
                        />
                        <ul>
                          {r.responsibilities.slice(0, 3).map((text, i) => (
                            <li key={i}>{text}</li>
                          ))}
                        </ul>
                        {r.quote && (
                          <details>
                            <summary>
                              Source evidence · {Math.round(r.confidence * 100)}
                              % confidence
                            </summary>
                            <blockquote>{r.quote}</blockquote>
                          </details>
                        )}
                        <label className="os-field os-compact-field">
                          Department
                          <select
                            value={r.departmentId}
                            onChange={(e) =>
                              patch({
                                roles: draft.roles.map((x) =>
                                  x.id === r.id
                                    ? {
                                        ...x,
                                        departmentId: e.target
                                          .value as OrgRole["departmentId"],
                                        source: "manual",
                                      }
                                    : x,
                                ),
                              })
                            }
                          >
                            {DEPARTMENTS.map((dep) => (
                              <option key={dep.id} value={dep.id}>
                                {dep.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </article>
                    ))}
                </div>
              </section>
            ))}
            <section className="os-add-role">
              <h2>Add a custom role</h2>
              <form
                className="os-inline"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newRole.trim()) return;
                  if (
                    draft.roles.some(
                      (r) =>
                        r.title.toLowerCase() === newRole.trim().toLowerCase(),
                    )
                  ) {
                    setError("That role already exists.");
                    return;
                  }
                  patch({
                    roles: [
                      ...draft.roles,
                      {
                        id: crypto.randomUUID(),
                        title: newRole.trim(),
                        departmentId: department as OrgRole["departmentId"],
                        responsibilities: [],
                        source: "manual",
                        quote: "",
                        confidence: 1,
                      },
                    ],
                  });
                  setNewRole("");
                }}
              >
                <label>
                  Role title
                  <input
                    value={newRole}
                    maxLength={180}
                    placeholder="e.g. Marketing Intern"
                    onChange={(e) => setNewRole(e.target.value)}
                  />
                </label>
                <label>
                  Department
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    {DEPARTMENTS.map((dep) => (
                      <option key={dep.id} value={dep.id}>
                        {dep.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" disabled={!newRole.trim()}>
                  Add role
                </button>
              </form>
            </section>
          </>
        )}
        {draft.step === 2 && (
          <>
            <div className="os-section-heading">
              <div>
                <h2>Your responsibility matrix</h2>
                <p>
                  Check all roles that do the work. Shared responsibilities are
                  welcome.
                </p>
              </div>
              <span className="os-ai-badge">AI prepared · You can adjust</span>
            </div>
            <div
              className="os-matrix-scroll"
              role="region"
              aria-label="Department responsibility matrix"
              tabIndex={0}
            >
              <table className="os-matrix">
                <thead>
                  <tr>
                    <th rowSpan={2} scope="col">
                      Action items
                    </th>
                    {DEPARTMENTS.filter((dep) =>
                      draft.roles.some((r) => r.departmentId === dep.id),
                    ).map((dep) => (
                      <th
                        key={dep.id}
                        colSpan={
                          draft.roles.filter((r) => r.departmentId === dep.id)
                            .length
                        }
                        scope="colgroup"
                      >
                        {dep.name}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {DEPARTMENTS.flatMap((dep) =>
                      draft.roles.filter((r) => r.departmentId === dep.id),
                    ).map((r) => (
                      <th key={r.id} scope="col">
                        {r.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DEPARTMENTS.map((dep) => (
                    <MatrixGroup
                      key={dep.id}
                      title={dep.name}
                      actions={draft.actions.filter(
                        (a) => a.departmentId === dep.id,
                      )}
                      roles={DEPARTMENTS.flatMap((dep) =>
                        draft.roles.filter((r) => r.departmentId === dep.id),
                      )}
                      draft={draft}
                      onToggle={toggle}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <p className="os-hint">
              Approval and communication routing are prepared in the background.
              You review the visible workflow next.
            </p>
          </>
        )}
        {(draft.step === 3 || draft.step === 4) && (
          <>
            {draft.step === 4 && (
              <>
                <div className="os-ai-note">
                  <span>✦</span>
                  <p>
                    Your board has work beyond member programs. Platypus uses
                    these same roles to plan socials, tabling and other one-off
                    needs.
                  </p>
                </div>
                <label className="os-field">
                  What does your board need to do?
                  <textarea
                    rows={2}
                    value={draft.boardGoal}
                    maxLength={1000}
                    onChange={(e) => patch({ boardGoal: e.target.value })}
                  />
                </label>
                <div className="os-chip-row">
                  <button
                    onClick={() =>
                      patch({
                        boardGoal:
                          "Plan a social gathering for our executive board.",
                      })
                    }
                  >
                    Board social
                  </button>
                  <button
                    onClick={() =>
                      patch({
                        boardGoal:
                          "Plan our Involvement Week tabling, with materials and two staffing shifts.",
                      })
                    }
                  >
                    Tabling event
                  </button>
                  <button
                    onClick={() =>
                      void run(
                        "board_workflow",
                        "Generate a workflow for the current boardGoal.",
                        true,
                      )
                    }
                  >
                    Generate with AI
                  </button>
                </div>
              </>
            )}
            {(draft.step === 3 ? draft.memberFlow : draft.boardFlow) && (
              <FlowEditor
                flow={(draft.step === 3 ? draft.memberFlow : draft.boardFlow)!}
                roles={draft.roles}
                disabled={!!busy}
                onChange={(f) =>
                  patch(
                    draft.step === 3
                      ? {
                          memberFlow: f,
                          approvals: { ...draft.approvals, member: false },
                        }
                      : {
                          boardFlow: f,
                          approvals: { ...draft.approvals, board: false },
                        },
                  )
                }
              />
            )}
            <form
              className="os-workflow-chat"
              onSubmit={(e) => {
                e.preventDefault();
                if (editInstruction.trim())
                  void run(
                    draft.step === 3 ? "member_workflow" : "board_workflow",
                    editInstruction,
                    true,
                  );
              }}
            >
              <label>
                Tell Platypus what to change
                <textarea
                  value={editInstruction}
                  maxLength={1500}
                  rows={2}
                  onChange={(e) => setEditInstruction(e.target.value)}
                  placeholder="e.g. Run venue booking and registration in parallel, and include the Marketing Intern."
                />
              </label>
              <button disabled={!editInstruction.trim()}>
                Suggest an update
              </button>
            </form>
            <p className="os-hint">
              You can keep a working draft and return later. Suggested changes
              require your approval.
            </p>
          </>
        )}
        {draft.step === 5 && (
          <>
            <div className="os-review-tiles">
              <div>
                <span>✓</span>
                <b>{draft.roles.length} roles understood</b>
                <p>Custom titles, grouped by department</p>
              </div>
              <div>
                <span>✓</span>
                <b>
                  {draft.assignments.filter((r) => r.roleIds.length).length}{" "}
                  responsibilities mapped
                </b>
                <p>Including shared work across roles</p>
              </div>
              <div>
                <span>✓</span>
                <b>2 workflows reviewed</b>
                <p>Member programs and board work</p>
              </div>
            </div>
            <div className="os-guide-cards">
              <section>
                <span className="os-eyebrow">READ WITH EVERY REQUEST</span>
                <h2>Your organization’s essentials</h2>
                <p>
                  Mission, roles, responsibilities, decision boundaries and
                  unresolved questions.
                </p>
                <details>
                  <summary>Read the generated AI guide</summary>
                  <pre tabIndex={0}>{draft.guide?.alwaysRead}</pre>
                </details>
              </section>
              <section>
                <span className="os-eyebrow">READ WHEN NEEDED</span>
                <h2>The supporting details</h2>
                <ul>
                  {draft.guide?.onDemand.map((part, i) => (
                    <li key={i}>
                      <details>
                        <summary>{part.topic}</summary>
                        <p>{part.when}</p>
                        <pre tabIndex={0}>{part.content}</pre>
                      </details>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            {!!draft.guide?.uncertainties.length && (
              <div className="os-uncertainty">
                <h3>Still to confirm</h3>
                <ul>
                  {draft.guide.uncertainties.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="os-prompt-reminder">
              <div>
                <h3>One more review: the AI instructions</h3>
                <p>
                  Review what Platypus tells the model at each step, and why.
                </p>
              </div>
              <button onClick={() => setShowPrompts(true)}>
                Review all prompts
              </button>
            </div>
            <label className="os-checkline">
              <input
                type="checkbox"
                checked={!!draft.approvals.promptReview}
                onChange={(e) =>
                  patch({
                    approvals: {
                      ...draft.approvals,
                      promptReview: e.target.checked,
                    },
                  })
                }
              />
              I have reviewed the AI instructions.
            </label>
          </>
        )}
      </fieldset>
      {error && (
        <div className="os-error" role="alert">
          {error}
          <button
            onClick={() => {
              setError("");
              void persist().catch(() => {});
            }}
          >
            Retry save
          </button>
        </div>
      )}
      {!finished && (
        <div className="os-bottom-actions">
          <div>
            {draft.step > 0 && (
              <button
                disabled={!!busy || reading}
                onClick={() => {
                  setError("");
                  patch({ step: draft.step - 1 });
                }}
              >
                ← Back
              </button>
            )}
          </div>
          <button
            className="os-primary"
            disabled={
              !!busy || reading || (draft.step === 1 && !draft.roles.length)
            }
            onClick={() => void advance()}
          >
            {draft.step === 0
              ? "Let AI prepare my team"
              : draft.step === 5
                ? "Confirm organization"
                : draft.step === 3
                  ? "This matches our workflow"
                  : draft.step === 4
                    ? "Keep this plan & continue"
                    : "Approve & continue"}{" "}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
      {finished && (
        <div className="os-complete">
          <span>
            ✓ Confirmed and saved online · Context v{draft.contextVersion}
          </span>
          <button
            onClick={() => {
              setFinished(false);
              patch({ step: 0 });
            }}
          >
            Review organization settings
          </button>
        </div>
      )}
      <PromptReview stage={stage} />
      <div className="os-footer">
        <span>
          {draft.aiRuns.at(-1)
            ? `Last AI response: ${draft.aiRuns.at(-1)!.provider} · ${draft.aiRuns.at(-1)!.model}`
            : "AI has not generated a response yet."}
        </span>
        <Link to="/phase1/setup-legacy">Previous setup reference</Link>
      </div>
      {showPrompts && (
        <Dialog
          title="The instructions behind your setup"
          onClose={() => setShowPrompts(false)}
        >
          <p>
            These are the exact versioned system prompts used by the setup
            service. Your organization information is supplied separately as
            context.
          </p>
          {(Object.keys(PROMPTS) as Stage[]).map((s) => (
            <PromptReview key={s} stage={s} />
          ))}
        </Dialog>
      )}
      {proposal && (
        <Dialog
          title="Review the suggested workflow"
          onClose={() => setProposal(null)}
        >
          <p>
            Your current workflow stays in place until you accept this update.
          </p>
          <FlowEditor
            flow={proposal.flow}
            roles={draft.roles}
            onChange={(f) => setProposal({ ...proposal, flow: f })}
          />
          <div className="os-bottom-actions">
            <button onClick={() => setProposal(null)}>
              Discard suggestion
            </button>
            <button
              className="os-primary"
              onClick={() => {
                patch(
                  proposal.stage === "member_workflow"
                    ? { memberFlow: proposal.flow }
                    : { boardFlow: proposal.flow },
                );
                setProposal(null);
                setEditInstruction("");
              }}
            >
              Accept update
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
function MatrixGroup({
  title,
  actions,
  roles,
  draft,
  onToggle,
}: {
  title: string;
  actions: SetupDraft["actions"];
  roles: OrgRole[];
  draft: SetupDraft;
  onToggle: (a: string, r: string, c: boolean) => void;
}) {
  return (
    <>
      <tr className="os-matrix-group">
        <th colSpan={roles.length + 1} scope="rowgroup">
          {title}
        </th>
      </tr>
      {actions.map((a) => (
        <tr key={a.id}>
          <th scope="row">
            <b>
              {a.title}
              {a.optional ? " · If applicable" : ""}
            </b>
            <span>{a.description}</span>
          </th>
          {roles.map((r) => (
            <td key={r.id}>
              <label className="os-matrix-check">
                <input
                  type="checkbox"
                  aria-label={`${r.title}: ${a.title}`}
                  checked={
                    draft.assignments
                      .find((x) => x.actionId === a.id)
                      ?.roleIds.includes(r.id) ?? false
                  }
                  onChange={(e) => onToggle(a.id, r.id, e.target.checked)}
                />
                <span className="os-sr">
                  {r.title}: {a.title}
                </span>
              </label>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
