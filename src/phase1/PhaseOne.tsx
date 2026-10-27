import {
  useEffect,
  lazy,
  Suspense,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  CAPABILITIES,
  FICTIONAL_CONSTITUTION,
  makeDraft,
  type ActivityKind,
  type Draft,
  type Suggestion,
} from "./model";
import {
  classify,
  confirmContext,
  conflicts,
  extract,
  makeSource,
  owner,
  resolveSuggestion,
  reviewSuggestion,
  setOwner,
  uncertainty,
  validateSuggestion,
  workflow,
} from "./logic";
import { localPreviewRepository } from "./repository";
import { SERVER_STORAGE } from "./serverStorage";
import type { ApprovedContext } from "./approvedContext";
import "./phase1.css";
import "./approvedWorkspace.css";
const LiveWorkspaceShell = lazy(() => import("../workspace/LiveWorkspaceShell"));
const OnlineSetup = lazy(() => import("../organization/OnlineSetup"));
const ApprovedWorkspace = lazy(() => import("./ApprovedWorkspace"));

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    spark: (
      <>
        <path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z" />
        <path d="m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5Z" />
      </>
    ),
    home: (
      <>
        <path d="m3 10 9-7 9 7v10H3Z" />
        <path d="M9 20v-7h6v7" />
      </>
    ),
    activity: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M7 3v4m10-4v4M3 11h18m-13 5h3" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    up: <path d="M12 19V5m-6 6 6-6 6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    file: (
      <>
        <path d="M14 3H5v18h14V8Z" />
        <path d="M14 3v5h5M8 12h8m-8 4h5" />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21v-3a6 6 0 0 1 12 0v3m1-17a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5" />
      </>
    ),
    back: <path d="m14 5-7 7 7 7" />,
    external: (
      <>
        <path d="M14 3h7v7m0-7L10 14" />
        <path d="M10 4H4v16h16v-6" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.spark}
    </svg>
  );
}
const scopeLabel = (s: string) =>
  s === "campus"
    ? "Campus organizations"
    : s === "companies"
      ? "Companies & sponsors"
      : "All relationships";
const capability = (id: string) =>
  CAPABILITIES.find((c) => c.id === id)?.label ?? id;
const shortDate = (d: string | null) =>
  d
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(d + "T12:00:00Z"))
    : "Not scheduled";
const principal = (d: Draft) => ({
  organizationId: d.organizationId,
  accountId: d.accountId,
  mayManage: true,
});

export default function PhaseOne() {
  const location=useLocation();
  const [example,setExample]=useState(()=>new URLSearchParams(location.search).get('example')==='1'||location.pathname.endsWith('/setup-legacy'));
  useEffect(()=>{
    if(new URLSearchParams(location.search).get('example')==='1'||location.pathname.endsWith('/setup-legacy')) setExample(true);
    else if(location.pathname.endsWith('/setup')) setExample(false);
  },[location.pathname,location.search]);
  // Server storage hidden: only the local example, never the live workspace (it calls /api/workspace).
  if(example || !SERVER_STORAGE) return <PreviousPhaseOne/>;
  return <Suspense fallback={<p role="status">Opening your workspace…</p>}><LiveWorkspaceShell/></Suspense>;
}
function PreviousPhaseOne() {
  const [scenario, setScenario] = useState<"A" | "B">("A");
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      return (
        localPreviewRepository(localStorage).read(principal(makeDraft())) ??
        makeDraft()
      );
    } catch {
      return makeDraft();
    }
  });
  const [storageNote, setStorageNote] = useState("");
  const [active, setActive] = useState<Draft | null>(() => {
    try {
      return localPreviewRepository(localStorage).readApproved(
        principal(draft),
      );
    } catch {
      return null;
    }
  });
  const location = useLocation();
  const [exampleMode, setExampleMode] = useState(() => !SERVER_STORAGE || new URLSearchParams(location.search).get("example") === "1");
  const [remote, setRemote] = useState<{ status: "loading" | "ready" | "absent" | "error"; context: ApprovedContext | null; message?: string }>({ status: "loading", context: null });
  const [contextAttempt, setContextAttempt] = useState(0);
  useEffect(() => {
    if (!SERVER_STORAGE) return; // no confirmed online organization to load
    if (location.pathname.endsWith("/setup-legacy") || new URLSearchParams(location.search).get("example") === "1") {
      setExampleMode(true);
      return;
    }
    if (location.pathname.endsWith("/setup")) {
      setExampleMode(false);
      return;
    }
    if (exampleMode) return;
    const controller = new AbortController();
    setRemote({ status: "loading", context: null });
    void import("./approvedContext").then(({ readApprovedContext }) => readApprovedContext(controller.signal)).then(context => {
      if (!controller.signal.aborted) setRemote({ status: context ? "ready" : "absent", context });
    }).catch(error => {
      if (!controller.signal.aborted) setRemote({ status: "error", context: null, message: (error as Error).message });
    });
    return () => controller.abort();
  }, [location.pathname, location.search, exampleMode, contextAttempt]);
  const approved = !exampleMode && remote.status === "ready" ? remote.context : null;
  const workspace = (example: ReactNode) => {
    if (exampleMode) return <><p className="approved-context-notice" role="note">Previous example preview · Changes here do not replace your confirmed online organization.</p>{example}</>;
    if (remote.status === "loading") return <p role="status">Loading your confirmed organization…</p>;
    if (approved) return <Suspense fallback={<p role="status">Opening your workspace…</p>}><ApprovedWorkspace context={approved} /></Suspense>;
    return <section className="approved-context-notice">
      <h1>{remote.status === "absent" ? "Confirm your organization" : "Workspace unavailable"}</h1>
      <p>{remote.status === "absent" ? "Complete organization setup to use your team's confirmed roles and activity workflow." : remote.message}</p>
      <Link to="/phase1/setup">Open organization setup</Link>{" · "}<Link to="/phase1?example=1">Open previous example preview</Link>
      {remote.status === "error" && <button className="approved-context-retry" onClick={() => setContextAttempt(n => n + 1)}>Retry</button>}
    </section>;
  };
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    try {
      localPreviewRepository(localStorage).write(principal(draft), draft);
      setStorageNote("Saved on this device");
    } catch {
      setStorageNote("Could not save · keep this page open");
    }
  }, [draft]);
  useEffect(() => {
    main.current?.focus();
  }, [location.pathname]);
  const chooseScenario = (s: "A" | "B") => {
    setExampleMode(true);
    setScenario(s);
    const fresh = makeDraft(s);
    let saved: Draft | null = null;
    try {
      saved = localPreviewRepository(localStorage).read(principal(fresh));
    } catch {
      /* in-memory demo */
    }
    setDraft(saved ?? fresh);
    try {
      setActive(
        localPreviewRepository(localStorage).readApproved(principal(fresh)),
      );
    } catch {
      setActive(null);
    }
  };
  return (
    <div className="p1">
      <a
        className="p1-skip"
        href="#p1-main"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
          main.current?.scrollIntoView({ block: "start" });
        }}
      >
        Skip to content
      </a>
      <aside className="p1-sidebar">
        <Link className="p1-brand" to="/phase1">
          <span className="p1-brand-mark">
            p<span>·</span>
          </span>
          platypus<span className="p1-beta">preview</span>
        </Link>
        <div className="p1-org">
          <span className="p1-avatar">{approved ? approved.alwaysRead.organization.name.slice(0, 2).toUpperCase() : "DF"}</span>
          <div>
            <b>{approved?.alwaysRead.organization.name ?? (exampleMode ? "Desert Founders" : "Your organization")}</b>
            <span>{approved ? `Confirmed · v${approved.contextVersion}` : exampleMode ? "Fictional example" : "Organization workspace"}</span>
          </div>
        </div>
        <nav aria-label="Preview navigation">
          <NavLink to="/phase1" end>
            <Icon name="home" />
            Home
          </NavLink>
          <NavLink to="/phase1/setup">
            <Icon name="people" />
            Organization setup
            <span className="p1-nav-dot" />
          </NavLink>
          <div className="p1-nav-label">RECENT ACTIVITIES</div>
          <NavLink to="/phase1/activity/member">
            <Icon name="activity" />
            {approved?.onDemand.memberWorkflow.title ?? (exampleMode ? "Founder Connections" : "Activity workflow")}
          </NavLink>
          <NavLink to="/phase1/activity/executive">
            <Icon name="activity" />
            {approved || !exampleMode ? "Board work" : "Board Representatives"}
          </NavLink>
        </nav>
        <div className="p1-sidebar-bottom">
          {exampleMode && <div className="p1-scenario">
            <label htmlFor="p1-scenario">Demo organization</label>
            <select
              id="p1-scenario"
              value={scenario}
              onChange={(e) => chooseScenario(e.target.value as "A" | "B")}
            >
              <option value="A">A · Marketing owns outreach</option>
              <option value="B">B · Split external relationships</option>
            </select>
          </div>}
          <Link to="/" className="p1-legacy">
            <Icon name="external" size={16} />
            Open legacy workspace
          </Link>
          <div className="p1-user">
            <span className="p1-avatar p1-person">JP</span>
            <div>
              <b>{exampleMode ? "Jordan Parker" : "Your workspace"}</b>
              <span>{exampleMode ? "President · fictional" : "Private test session"}</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="p1-body">
        <header className="p1-topbar">
          <span>
            Workspace <span className="p1-slash">/</span>{" "}
            {location.pathname.includes("setup")
              ? "Organization setup"
              : location.pathname.includes("activity")
                ? "Activities"
                : "Home"}
          </span>
          <span className="p1-prototype">{approved ? `Confirmed organization · v${approved.contextVersion}` : "Phase 1 · Interactive prototype"}</span>
        </header>
        <main id="p1-main" tabIndex={-1} ref={main}>
          <Routes>
            <Route
              path="setup"
              element={
                SERVER_STORAGE ? (
                  <Suspense
                    fallback={<p role="status">Preparing organization setup…</p>}
                  >
                    <OnlineSetup />
                  </Suspense>
                ) : (
                  <Navigate to="/phase1/setup-legacy" replace />
                )
              }
            />
            <Route index element={workspace(<Home draft={draft} active={active} />)} />
            <Route
              path="setup-legacy"
              element={
                <Onboarding
                  draft={draft}
                  setDraft={setDraft}
                  storageNote={storageNote}
                  onConfirm={(d) => {
                    setDraft(d);
                    setActive(structuredClone(d));
                    try {
                      localPreviewRepository(localStorage).approve(
                        principal(d),
                        d,
                      );
                    } catch {
                      setStorageNote(
                        "Confirmed for this session · could not save",
                      );
                    }
                  }}
                />
              }
            />
            <Route
              path="activity/:kind"
              element={
                workspace(<Workspace
                  draft={active ?? makeDraft(scenario)}
                  active={!!active}
                />)
              }
            />
          </Routes>
        </main>
        <footer className="p1-footer">
          <span>Fictional data only</span>
          <span>
            {location.pathname.endsWith("/setup")
              ? "AI suggestions · Reviewed by you"
              : approved ? "Your confirmed team and workflow" : "Example previews do not change online settings"}
          </span>
        </footer>
      </div>
    </div>
  );
}
function Composer({
  onSubmit,
  compact = false,
  placeholder = "What would you like to make happen?",
}: {
  onSubmit: (text: string) => void;
  compact?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text.trim());
      setText("");
    }
  }
  return (
    <form
      className={`p1-composer ${compact ? "p1-composer-compact" : ""}`}
      onSubmit={submit}
    >
      <label
        className="p1-sr"
        htmlFor={compact ? "p1-work-prompt" : "p1-home-prompt"}
      >
        Your goal
      </label>
      <textarea
        id={compact ? "p1-work-prompt" : "p1-home-prompt"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={500}
        placeholder={placeholder}
        rows={compact ? 1 : 3}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (text.trim()) {
              onSubmit(text.trim());
              setText("");
            }
          }
        }}
      />
      <div className="p1-composer-bottom">
        <span>
          <Icon name="spark" size={16} />
          {compact
            ? "Ask about this activity"
            : "Grounded in your organization"}
        </span>
        <button
          type="submit"
          className="p1-send"
          aria-label="Submit goal"
          disabled={!text.trim()}
        >
          <Icon name="up" />
        </button>
      </div>
    </form>
  );
}
function Home({ draft, active }: { draft: Draft; active: Draft | null }) {
  const navigate = useNavigate();
  const [reply, setReply] = useState("");
  const [intent, setIntent] = useState<ActivityKind | null>(null);
  const send = (t: string) => {
    const kind = classify(t);
    setIntent(kind);
    setReply(
      kind
        ? `I’ll start with ${kind === "member_activity" ? "the member activity playbook" : "a short executive task chain"} and ${active ? "your confirmed organization context" : "the fictional example context"}. Review the workflow before anything is created.`
        : "Is this for your members or for the executive board?",
    );
  };
  return (
    <div className="p1-home">
      <section className="p1-hero">
        <div className="p1-eyebrow">
          <Icon name="spark" size={16} />
          YOUR ORGANIZATION, IN MOTION
        </div>
        <h1>
          A little less coordinating.
          <br />
          <span>A lot more happening.</span>
        </h1>
        <p>Tell Platypus the goal. Build the next steps together.</p>
        <Composer onSubmit={send} />
        <div className="p1-prompt-chips">
          <button onClick={() => send("Plan a member networking workshop")}>
            Plan a member activity <Icon name="arrow" size={16} />
          </button>
          <button
            onClick={() =>
              send("Coordinate board representatives for a school notice")
            }
          >
            Handle a board obligation <Icon name="arrow" size={16} />
          </button>
        </div>
        {reply && (
          <section className="p1-reply" aria-live="polite">
            <Icon name="spark" />
            <div>
              <b>Here’s a starting point</b>
              <p>{reply}</p>
              {intent ? (
                <button
                  className="p1-primary"
                  onClick={() =>
                    navigate(
                      `/phase1/activity/${intent === "member_activity" ? "member" : "executive"}`,
                    )
                  }
                >
                  Review workflow <Icon name="arrow" size={16} />
                </button>
              ) : (
                <div className="p1-actions">
                  <button onClick={() => setIntent("member_activity")}>
                    Member activity
                  </button>
                  <button onClick={() => setIntent("executive_obligation")}>
                    Board obligation
                  </button>
                  <button onClick={() => setIntent("member_activity")}>
                    Not sure — use the suggested option
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </section>
      <section className="p1-home-grid">
        <div>
          <div className="p1-section-head">
            <h2>Keep things moving</h2>
            <span>2 activities</span>
          </div>
          <Link className="p1-activity-card" to="/phase1/activity/member">
            <div className="p1-activity-top">
              <span className="p1-type">
                <Icon name="activity" />
                Member activity
              </span>
              <span className="p1-status">Planning</span>
            </div>
            <h3>Founder Connections</h3>
            <p>A thoughtful evening connecting students and founders.</p>
            <div className="p1-progress">
              <i style={{ width: "25%" }} />
            </div>
            <div className="p1-card-foot">
              <span>
                <span className="p1-mini-avatar">PD</span>Programs Director
              </span>
              <Icon name="arrow" size={18} />
            </div>
          </Link>
          <Link
            className="p1-activity-card p1-small-card"
            to="/phase1/activity/executive"
          >
            <span className="p1-icon-tile">
              <Icon name="people" />
            </span>
            <div>
              <span className="p1-overline">EXECUTIVE OBLIGATION</span>
              <h3>Board Representatives</h3>
              <p>Confirm attendance for the school briefing.</p>
            </div>
            <Icon name="arrow" size={18} />
          </Link>
        </div>
        <div className="p1-home-side">
          <div className="p1-section-head">
            <h2>A moment of your attention</h2>
            <span>1 item</span>
          </div>
          <Link className="p1-attention" to="/phase1/setup">
            <span className="p1-icon-tile">
              <Icon name="people" />
            </span>
            <h3>
              {active
                ? "Review your organization context"
                : "Make this workspace yours"}
            </h3>
            <p>
              {active
                ? `Context v${active.version} is confirmed. Review responsibilities whenever your team changes.`
                : "Confirm how your team works so the right work reaches the right role."}
            </p>
            <span className="p1-text-link">
              {active ? "Review organization" : "Continue organization setup"}
              <Icon name="arrow" size={17} />
            </span>
          </Link>
          <div className="p1-context-note">
            <Icon name="check" size={18} />
            <div>
              <b>
                {active
                  ? "Your confirmed context"
                  : "Example context · Organization " + draft.scenario}
              </b>
              <p>
                Company relationships →{" "}
                {owner(
                  active ?? makeDraft(draft.scenario),
                  "relationships",
                  "companies",
                ) ?? "Needs confirmation"}
              </p>
              <span>
                {active
                  ? "Used for these previews"
                  : "Confirm setup to use your own changes"}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
function Onboarding({
  draft: d,
  setDraft,
  onConfirm,
  storageNote,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onConfirm: (d: Draft) => void;
  storageNote: string;
}) {
  const [error, setError] = useState("");
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCap, setEditCap] = useState("planning");
  const navigate = useNavigate();
  const steps = [
    "Basics",
    "Constitution",
    "Roles",
    "Responsibilities",
    "Review",
  ];
  const pending = d.suggestions.filter((s) => s.decision === "pending").length;
  const conflict = conflicts(d)[0];
  const patch = (v: Partial<Draft>) =>
    setDraft({ ...d, ...v, confirmed: false });
  async function read(text: string, name: string) {
    setBusy(true);
    setError("");
    try {
      const source = await makeSource(text, name, d.organizationId);
      const suggestions = extract(source)
        .map((s) => validateSuggestion(s, source))
        .filter((s): s is Suggestion => !!s);
      patch({
        source,
        suggestions,
        assignments: d.assignments.filter((a) => a.source !== "constitution"),
      });
      if (!suggestions.length)
        setError(
          "No supported clauses found. Keep your manual roles or try the fictional example.",
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const next = () => {
    setError("");
    if (d.step === 0 && !d.name.trim()) {
      setError("Give your fictional organization a name.");
      return;
    }
    if (
      d.step === 2 &&
      (d.roles.some((r) => !r.title.trim()) ||
        new Set(d.roles.map((r) => r.title.trim().toLowerCase())).size !==
          d.roles.length)
    ) {
      setError("Give each role a distinct, non-empty title.");
      return;
    }
    if (d.step === 1 && pending) {
      setError("Accept or reject each suggestion, or skip this document.");
      return;
    }
    if (d.step === 3 && conflicts(d).length) {
      setError("Resolve the responsibility suggestion before continuing.");
      return;
    }
    patch({ step: Math.min(4, d.step + 1) });
  };
  const skip = () => {
    setError("");
    if (d.step === 1)
      patch({
        step: 2,
        source: null,
        suggestions: [],
        assignments: d.assignments.filter((a) => a.source !== "constitution"),
      });
    else patch({ step: Math.min(4, d.step + 1) });
  };
  return (
    <div className="p1-setup">
      <div className="p1-setup-meta">
        <Link to="/phase1">
          <Icon name="back" size={16} />
          Back to home
        </Link>
        <span className="p1-save-note" role="status">
          {storageNote}
        </span>
      </div>
      <div className="p1-step-track" aria-label="Setup progress">
        {steps.map((s, i) => (
          <span
            key={s}
            className={i <= d.step ? "p1-step-active" : ""}
            aria-current={i === d.step ? "step" : undefined}
          >
            <i>{i < d.step ? <Icon name="check" size={13} /> : i + 1}</i>
            <span>{s}</span>
          </span>
        ))}
      </div>
      <div className="p1-setup-title">
        <div className="p1-eyebrow">STEP {d.step + 1} OF 5</div>
        <h1>
          {
            [
              "Let’s get to know your organization.",
              "Start with what’s already written.",
              "Your team. Your role titles.",
              "Give every responsibility a home.",
              "Does this sound like your organization?",
            ][d.step]
          }
        </h1>
        <p>
          {
            [
              "A few choices now. A more helpful workspace ahead.",
              "Bring a fictional constitution. Review every suggestion.",
              "Keep the titles your organization actually uses.",
              "Start with the suggested map. Change only what needs changing.",
              "Confirm this understanding before it guides your activities.",
            ][d.step]
          }
        </p>
      </div>
      <section className="p1-setup-card" key={d.step}>
        {d.step === 0 && (
          <>
            <label className="p1-field">
              Organization name
              <input
                maxLength={80}
                value={d.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </label>
            <fieldset className="p1-choices">
              <legend>What best describes your organization?</legend>
              {[
                "Professional development",
                "Community & social",
                "Service & volunteering",
              ].map((p, i) => (
                <button
                  key={p}
                  aria-pressed={d.profile === p}
                  onClick={() =>
                    patch({
                      profile: p,
                      mission:
                        i === 0
                          ? "Help students build meaningful professional connections."
                          : i === 1
                            ? "Create a welcoming community through shared experiences."
                            : "Help students make a positive difference through service.",
                    })
                  }
                >
                  <span className="p1-choice-letter">{"ABC"[i]}</span>
                  <b>{p}</b>
                  {d.profile === p && <Icon name="check" size={18} />}
                </button>
              ))}
            </fieldset>
            <ChoiceExtras
              suggested={() => patch({ profile: "Professional development" })}
              add={(value) => patch({ profile: value })}
            />
            <div className="p1-soft-note">
              <Icon name="spark" size={18} />
              <div>
                <b>A starting mission</b>
                <p>{d.mission}</p>
              </div>
            </div>
            <details className="p1-advanced">
              <summary>Advanced · mission & operating goal</summary>
              <label className="p1-field">
                Mission
                <textarea
                  value={d.mission}
                  maxLength={300}
                  onChange={(e) => patch({ mission: e.target.value })}
                />
              </label>
              <label className="p1-field">
                Primary operating goal
                <input
                  value={d.goal}
                  maxLength={150}
                  onChange={(e) => patch({ goal: e.target.value })}
                />
              </label>
            </details>
          </>
        )}
        {d.step === 1 && (
          <>
            <div className="p1-upload">
              <span className="p1-upload-icon">
                <Icon name="file" size={30} />
              </span>
              <h2>A head start, from your constitution</h2>
              <p>Upload a fictional .txt or .md file, or try our example.</p>
              <label className="p1-upload-label">
                Upload fictional constitution
                <input
                  type="file"
                  aria-label="Upload fictional constitution"
                  accept=".txt,.md,text/plain,text/markdown"
                  disabled={busy}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    if (f.size > 80000 || !/\.(txt|md)$/i.test(f.name)) {
                      setError(
                        "Choose a fictional .txt or .md file under 80 KB.",
                      );
                      return;
                    }
                    await read(await f.text(), f.name);
                  }}
                />
              </label>
              <button
                className="p1-secondary"
                disabled={busy}
                onClick={() =>
                  void read(
                    FICTIONAL_CONSTITUTION,
                    "fictional-constitution.txt",
                  )
                }
              >
                {busy ? "Reading…" : "Use fictional example"}
              </button>
              <button
                className="p1-plain"
                onClick={() => setShowPaste(!showPaste)}
              >
                Paste fictional text instead
              </button>
            </div>
            {showPaste && (
              <div className="p1-paste">
                <label className="p1-field">
                  Fictional constitution text
                  <textarea
                    value={paste}
                    maxLength={20000}
                    rows={5}
                    onChange={(e) => setPaste(e.target.value)}
                  />
                </label>
                <button
                  className="p1-secondary"
                  disabled={!paste.trim() || busy}
                  onClick={() =>
                    void read(paste, "pasted-fictional-constitution.txt")
                  }
                >
                  Read pasted text
                </button>
              </div>
            )}
            {d.source && (
              <>
                <div className="p1-section-head">
                  <div>
                    <h2>Suggestions to review</h2>
                    <span>{pending} remaining · Local demo extraction</span>
                  </div>
                  <Icon name="file" />
                </div>
                <p className="p1-source-name">
                  {d.source.fileName} · Nothing becomes a fact automatically.
                </p>
                {d.suggestions.map((s) => (
                  <article className="p1-suggestion" key={s.id}>
                    <div className="p1-suggestion-head">
                      <span className="p1-mini-avatar">
                        {s.roleTitle
                          .split(" ")
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <div>
                        <b>{s.roleTitle}</b>
                        <p>
                          {capability(s.capabilityId)}
                          {s.scope !== "all" ? " · " + scopeLabel(s.scope) : ""}
                        </p>
                      </div>
                      <span className="p1-confidence">
                        {Math.round(s.confidence * 100)}% confidence
                      </span>
                    </div>
                    <blockquote>“{s.quote}”</blockquote>
                    <div className="p1-actions">
                      {s.decision === "pending" ? (
                        <>
                          <button
                            onClick={() =>
                              setDraft(reviewSuggestion(d, s.id, "accepted"))
                            }
                          >
                            <Icon name="check" size={16} />
                            Accept
                          </button>
                          <button
                            onClick={() => {
                              setEdit(s.id);
                              setEditTitle(s.roleTitle);
                              setEditCap(s.capabilityId);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              setDraft(reviewSuggestion(d, s.id, "rejected"))
                            }
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <>
                          <span>
                            {s.decision === "accepted"
                              ? "Accepted · final mapping still needs review"
                              : "Rejected"}
                            {s.edited ? " · Edited" : ""}
                          </span>
                          <button
                            onClick={() =>
                              patch({
                                suggestions: d.suggestions.map((x) =>
                                  x.id === s.id
                                    ? { ...x, decision: "pending" }
                                    : x,
                                ),
                                assignments: d.assignments.filter(
                                  (a) =>
                                    !(
                                      a.source === "constitution" &&
                                      a.capabilityId === s.capabilityId &&
                                      a.scope === s.scope
                                    ),
                                ),
                              })
                            }
                          >
                            Review again
                          </button>
                        </>
                      )}
                    </div>
                    {edit === s.id && (
                      <form
                        className="p1-inline-edit"
                        onSubmit={(e) => {
                          e.preventDefault();
                          setDraft(
                            reviewSuggestion(
                              d,
                              s.id,
                              "accepted",
                              editTitle,
                              editCap,
                            ),
                          );
                          setEdit(null);
                        }}
                      >
                        <label className="p1-field">
                          Suggested role title
                          <input
                            value={editTitle}
                            maxLength={80}
                            onChange={(e) => setEditTitle(e.target.value)}
                          />
                        </label>
                        <label className="p1-field">
                          Suggested capability
                          <select
                            value={editCap}
                            onChange={(e) => setEditCap(e.target.value)}
                          >
                            {CAPABILITIES.map((c) => (
                              <option value={c.id} key={c.id}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          className="p1-secondary"
                          disabled={!editTitle.trim()}
                        >
                          Save edited suggestion
                        </button>
                        <button type="button" onClick={() => setEdit(null)}>
                          Cancel
                        </button>
                      </form>
                    )}
                  </article>
                ))}
              </>
            )}
          </>
        )}
        {d.step === 2 && (
          <>
            <div className="p1-soft-note">
              <Icon name="people" />
              <p>
                Titles can be renamed. Each role can own several
                responsibilities.
              </p>
            </div>
            <div className="p1-role-list">
              {d.roles.map((r, i) => (
                <div className="p1-role-row" key={r.id}>
                  <span className="p1-mini-avatar">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <label className="p1-sr" htmlFor={r.id}>
                    Role {i + 1} title
                  </label>
                  <input
                    id={r.id}
                    value={r.title}
                    maxLength={80}
                    onChange={(e) =>
                      patch({
                        roles: d.roles.map((x) =>
                          x.id === r.id ? { ...x, title: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <span>
                    {
                      d.assignments.filter(
                        (a) =>
                          a.roleId === r.id &&
                          a.responsibility === "owner" &&
                          a.confirmedByUser,
                      ).length
                    }{" "}
                    responsibilities
                  </span>
                </div>
              ))}
            </div>
            <details className="p1-advanced">
              <summary>Add a custom role</summary>
              <form
                className="p1-inline-edit"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!roleName.trim()) return;
                  if (
                    d.roles.some(
                      (r) =>
                        r.title.toLowerCase() === roleName.trim().toLowerCase(),
                    )
                  ) {
                    setError("That role title already exists.");
                    return;
                  }
                  patch({
                    roles: [
                      ...d.roles,
                      { id: crypto.randomUUID(), title: roleName.trim() },
                    ],
                  });
                  setRoleName("");
                }}
              >
                <label className="p1-field">
                  New role title
                  <input
                    value={roleName}
                    maxLength={80}
                    onChange={(e) => setRoleName(e.target.value)}
                  />
                </label>
                <button className="p1-secondary" disabled={!roleName.trim()}>
                  Add role
                </button>
              </form>
            </details>
          </>
        )}
        {d.step === 3 && (
          <>
            {conflict ? (
              <div className="p1-conflict">
                <span className="p1-overline">ONE DECISION TO CLEAR UP</span>
                <h2>
                  Who should own{" "}
                  {conflict.assignment.scope === "all"
                    ? capability(conflict.assignment.capabilityId).toLowerCase()
                    : scopeLabel(conflict.assignment.scope).toLowerCase()}
                  ?
                </h2>
                <p>
                  {conflict.current
                    ? `Your manual setting is ${conflict.current}. The constitution suggests ${conflict.suggested}.`
                    : `The constitution suggests ${conflict.suggested}. Please confirm this responsibility.`}
                </p>
                <div className="p1-choices">
                  <button
                    onClick={() =>
                      setDraft(resolveSuggestion(d, conflict.assignment, false))
                    }
                  >
                    <span className="p1-choice-letter">A</span>Keep{" "}
                    {conflict.current ?? "the manual map"}
                  </button>
                  <button
                    onClick={() =>
                      setDraft(resolveSuggestion(d, conflict.assignment, true))
                    }
                  >
                    <span className="p1-choice-letter">B</span>Use{" "}
                    {conflict.suggested}
                  </button>
                </div>
                <ChoiceExtras
                  suggested={() =>
                    setDraft(resolveSuggestion(d, conflict.assignment, false))
                  }
                  add={(title) => {
                    const r = { id: crypto.randomUUID(), title };
                    setDraft(
                      setOwner(
                        resolveSuggestion(
                          { ...d, roles: [...d.roles, r] },
                          conflict.assignment,
                          false,
                        ),
                        conflict.assignment.capabilityId,
                        r.id,
                        conflict.assignment.scope,
                      ),
                    );
                  }}
                />
                <p className="p1-caption">
                  Your confirmed choice has priority. Other decisions wait until
                  this one is resolved.
                </p>
              </div>
            ) : (
              <>
                <div className="p1-section-head">
                  <h2>Your responsibility map</h2>
                  <span>Click to adjust</span>
                </div>
                <div className="p1-map">
                  {CAPABILITIES.map((c) => (
                    <div className="p1-map-row" key={c.id}>
                      <span>{c.label}</span>
                      <div>
                        {c.id === "relationships" ? (
                          (["campus", "companies"] as const).map((scope) => (
                            <label className="p1-scope-select" key={scope}>
                              <span>{scopeLabel(scope)}</span>
                              <select
                                aria-label={`${scopeLabel(scope)} owner`}
                                value={
                                  d.roles.find(
                                    (r) => r.title === owner(d, c.id, scope),
                                  )?.id ?? ""
                                }
                                onChange={(e) =>
                                  setDraft(
                                    setOwner(d, c.id, e.target.value, scope),
                                  )
                                }
                              >
                                <option value="">Needs confirmation</option>
                                {d.roles.map((r) => (
                                  <option value={r.id} key={r.id}>
                                    {r.title}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ))
                        ) : (
                          <select
                            aria-label={`${c.label} owner`}
                            value={
                              d.roles.find((r) => r.title === owner(d, c.id))
                                ?.id ?? ""
                            }
                            onChange={(e) =>
                              setDraft(setOwner(d, c.id, e.target.value))
                            }
                          >
                            <option value="">Needs confirmation</option>
                            {d.roles.map((r) => (
                              <option value={r.id} key={r.id}>
                                {r.title}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <fieldset className="p1-preference">
                  <legend>How should plans move forward?</legend>
                  {[
                    "President reviews plans",
                    "Owner drafts, president approves",
                  ].map((p) => (
                    <button
                      key={p}
                      aria-pressed={d.preference === p}
                      onClick={() => patch({ preference: p })}
                    >
                      {p}
                    </button>
                  ))}
                </fieldset>
                <ChoiceExtras
                  suggested={() =>
                    patch({ preference: "President reviews plans" })
                  }
                  add={(value) => patch({ preference: value })}
                />
                <details className="p1-advanced">
                  <summary>
                    Advanced · approvers, support & detailed capabilities
                  </summary>
                  <p className="p1-caption">
                    These seven groups can grow or change later. No fixed
                    eight-role limit.
                  </p>
                  {CAPABILITIES.map((c) => (
                    <div className="p1-advanced-map" key={c.id}>
                      <b>{c.label}</b>
                      {(["approver", "support", "informed"] as const).map(
                        (resp) => (
                          <label key={resp}>
                            {resp}
                            <select
                              aria-label={`${c.label} ${resp}`}
                              value={
                                d.assignments.find(
                                  (a) =>
                                    a.capabilityId === c.id &&
                                    a.responsibility === resp &&
                                    a.scope === "all" &&
                                    a.confirmedByUser,
                                )?.roleId ?? ""
                              }
                              onChange={(e) =>
                                e.target.value
                                  ? setDraft(
                                      setOwner(
                                        d,
                                        c.id,
                                        e.target.value,
                                        "all",
                                        resp,
                                      ),
                                    )
                                  : patch({
                                      assignments: d.assignments.filter(
                                        (a) =>
                                          !(
                                            a.capabilityId === c.id &&
                                            a.responsibility === resp
                                          ),
                                      ),
                                    })
                              }
                            >
                              <option value="">None</option>
                              {d.roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.title}
                                </option>
                              ))}
                            </select>
                          </label>
                        ),
                      )}
                    </div>
                  ))}
                </details>
              </>
            )}
          </>
        )}
        {d.step === 4 && (
          <>
            <div className="p1-review-summary">
              <span className="p1-icon-tile">
                <Icon name="spark" size={26} />
              </span>
              <h2>{d.name}</h2>
              <p>{d.mission}</p>
              <span>
                {d.profile} · {d.preference}
              </span>
            </div>
            <div className="p1-summary-roles">
              {d.roles.map((r) => {
                const caps = [
                  ...new Set(
                    d.assignments
                      .filter(
                        (a) =>
                          a.roleId === r.id &&
                          a.responsibility === "owner" &&
                          a.confirmedByUser,
                      )
                      .map((a) => capability(a.capabilityId)),
                  ),
                ];
                return caps.length ? (
                  <div key={r.id}>
                    <b>{r.title}</b>
                    <span>{caps.join(" · ")}</span>
                  </div>
                ) : null;
              })}
            </div>
            <div className="p1-soft-note">
              <Icon name="check" />
              <div>
                <b>
                  {conflicts(d).length || pending
                    ? "Some suggestions still need review"
                    : "Ready for your confirmation"}
                </b>
                <p>
                  {CAPABILITIES.filter(
                    (c) => c.id !== "relationships" && !owner(d, c.id),
                  ).length
                    ? "Some responsibilities need an owner. The preview will ask before assigning that work."
                    : "Company relationships: " +
                      (owner(d, "relationships", "companies") ??
                        "Needs confirmation") +
                      ". Campus relationships: " +
                      (owner(d, "relationships", "campus") ??
                        "Needs confirmation") +
                      "."}
                </p>
              </div>
            </div>
            <div className="p1-example-grid">
              <div>
                <span className="p1-overline">MEMBER ACTIVITY</span>
                <h3>Founder Connections</h3>
                <p>
                  Standard playbook →{" "}
                  {owner(d, "planning") ?? "Choose planning owner"} plans;{" "}
                  {owner(d, "relationships", "companies") ??
                    "Choose relationship owner"}{" "}
                  contacts founders.
                </p>
              </div>
              <div>
                <span className="p1-overline">EXECUTIVE OBLIGATION</span>
                <h3>Board Representatives</h3>
                <p>
                  Short task chain →{" "}
                  {owner(d, "staffing") ?? "Choose staffing owner"} confirms
                  representatives;{" "}
                  {owner(d, "documentation") ?? "Choose documentation owner"}{" "}
                  records evidence.
                </p>
              </div>
            </div>
            <p className="p1-caption">
              Only confirmed organization information guides future previews.
              Raw conversations and personal preferences stay out of handoff.
            </p>
          </>
        )}
      </section>
      {error && (
        <p className="p1-error" role="alert">
          {error}
        </p>
      )}
      <div className="p1-setup-actions">
        {d.step > 0 ? (
          <button
            className="p1-plain"
            onClick={() => patch({ step: d.step - 1 })}
          >
            <Icon name="back" size={16} />
            Back
          </button>
        ) : (
          <span />
        )}
        <div>
          {d.step < 4 && (
            <button className="p1-plain" onClick={skip}>
              {d.step === 1 ? "Skip constitution" : "Skip"}
            </button>
          )}
          {d.step < 4 ? (
            <button className="p1-primary" onClick={next}>
              Continue
              <Icon name="arrow" size={17} />
            </button>
          ) : (
            <button
              className="p1-primary"
              disabled={
                !!pending ||
                !!conflicts(d).length ||
                !d.name.trim() ||
                d.roles.some((r) => !r.title.trim())
              }
              onClick={() => {
                const confirmed = confirmContext(d);
                if (!confirmed.confirmed) {
                  setError("Review the remaining suggestions first.");
                  return;
                }
                onConfirm(confirmed);
                navigate("/phase1");
              }}
            >
              Confirm organization
              <Icon name="check" size={17} />
            </button>
          )}
        </div>
      </div>
      <p className="p1-setup-foot">
        Set up at your pace. You can leave and resume on this device.
        <br />
        Five minutes is a testing goal, not a measured result.
      </p>
    </div>
  );
}
function ChoiceExtras({
  suggested,
  add,
}: {
  suggested: () => void;
  add: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  return (
    <div className="p1-choice-extras">
      <button className="p1-plain" onClick={suggested}>
        Not sure — use the suggested option
      </button>
      <button className="p1-plain" onClick={() => setOpen(!open)}>
        + Add another option
      </button>
      {open && (
        <form
          className="p1-inline-edit"
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) {
              add(value.trim());
              setOpen(false);
              setValue("");
            }
          }}
        >
          <label className="p1-field">
            Your option
            <input
              value={value}
              maxLength={80}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <button className="p1-secondary" disabled={!value.trim()}>
            Use this option
          </button>
        </form>
      )}
    </div>
  );
}
function Workspace({ draft: d, active }: { draft: Draft; active: boolean }) {
  const location = useLocation();
  const kind: ActivityKind = location.pathname.endsWith("executive")
    ? "executive_obligation"
    : "member_activity";
  const isMember = kind === "member_activity";
  const tasks = useMemo(() => workflow(d, kind), [d, kind]);
  const [showAll, setShowAll] = useState(false);
  const [view, setView] = useState<"list" | "board">("list");
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, string>>({});
  const [review, setReview] = useState(false);
  const [approved, setApproved] = useState(false);
  const [reply, setReply] = useState("");
  const [clarify, setClarify] = useState(false);
  const [override, setOverride] = useState<string | null>(null);
  useEffect(() => {
    setShowAll(false);
    setSelected(null);
    setReview(false);
    setApproved(false);
    setStatus({});
    setReply("");
    setClarify(false);
    setOverride(null);
  }, [kind, d.organizationId]);
  const visible = showAll ? tasks : tasks.slice(0, isMember ? 5 : 4);
  const current = tasks.find((t) => t.id === selected);
  const missing = uncertainty(d);
  return (
    <div className="p1-workspace">
      <div className="p1-work-breadcrumb">
        <Link to="/phase1">Home</Link>
        <span>/</span>
        <span>{isMember ? "Member activity" : "Executive obligation"}</span>
      </div>
      <div className="p1-work-icon">
        <Icon name={isMember ? "activity" : "people"} size={32} />
      </div>
      <div className="p1-work-title">
        <div>
          <span className="p1-overline">
            {isMember ? "MEMBER ACTIVITY" : "EXECUTIVE OBLIGATION"}
          </span>
          <h1>{isMember ? "Founder Connections" : "Board Representatives"}</h1>
        </div>
        <button
          className="p1-primary"
          onClick={() => setReview(true)}
          disabled={approved}
        >
          {approved ? (
            <>
              <Icon name="check" size={17} />
              Approved preview
            </>
          ) : (
            <>
              Review plan
              <Icon name="arrow" size={17} />
            </>
          )}
        </button>
      </div>
      <p className="p1-work-goal">
        {isMember
          ? "Bring students and local founders together for practical conversations and new connections."
          : "Confirm two executive board representatives for a fictional school briefing, then record completion."}
      </p>
      <div className="p1-properties">
        <div>
          <span>Owner</span>
          <b>
            <span className="p1-mini-avatar">{isMember ? "PD" : "PR"}</span>
            {owner(d, isMember ? "planning" : "compliance") ??
              "Needs confirmation"}
          </b>
        </div>
        <div>
          <span>Status</span>
          <b>
            <span className="p1-status">
              {approved ? "Ready to start" : "Draft plan"}
            </span>
          </b>
        </div>
        <div>
          <span>Context</span>
          <b>
            {active
              ? `Confirmed · v${d.version}`
              : `Example · Organization ${d.scenario}`}
          </b>
        </div>
        <div>
          <span>Risk</span>
          <b className={tasks.some((t) => t.risk) ? "p1-risk-text" : ""}>
            {tasks.some((t) => t.risk)
              ? "Needs a responsibility decision"
              : "No owner gaps in this preview"}
          </b>
        </div>
      </div>
      <section className="p1-next">
        <span className="p1-icon-tile">
          <Icon name="arrow" />
        </span>
        <div>
          <span className="p1-overline">NEXT ACTION</span>
          <h3>
            {approved
              ? "Share the approved task chain with your board"
              : "Review responsibilities before you start"}
          </h3>
          <p>
            {isMember
              ? `Company outreach belongs to ${owner(d, "relationships", "companies") ?? "a role you confirm"}. The member playbook supplies the starting steps.`
              : "Four focused steps. Staffing and evidence follow your organization’s responsibility map."}
          </p>
        </div>
      </section>
      <div className="p1-work-columns">
        <section className="p1-task-section">
          <div className="p1-section-head">
            <h2>
              The plan <span className="p1-count">{tasks.length}</span>
            </h2>
            <div className="p1-segment" role="group" aria-label="Task view">
              <button
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                List
              </button>
              <button
                aria-pressed={view === "board"}
                onClick={() => setView("board")}
              >
                Board
              </button>
            </div>
          </div>
          <p className="p1-caption p1-plan-source">
            {isMember
              ? "Standard member playbook · adapted to your responsibility map"
              : "Short executive task chain · fictional school notice"}
            <br />
            Dates calculated by the existing rule engine.
          </p>
          {view === "list" ? (
            <div className="p1-task-list">
              {visible.map((t, i) => (
                <button
                  key={t.id}
                  className="p1-task-row"
                  onClick={() => setSelected(selected === t.id ? null : t.id)}
                  aria-expanded={selected === t.id}
                >
                  <span className="p1-task-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="p1-task-title">
                    <b>{t.title}</b>
                    <span>
                      {t.owner ?? "Needs owner"}
                      {t.risk ? " · " + t.risk : ""}
                    </span>
                  </span>
                  <span
                    className={`p1-task-status ${status[t.id] === "Done" ? "p1-done" : ""}`}
                  >
                    {status[t.id] ?? t.status}
                  </span>
                  <span className="p1-task-date">{shortDate(t.date)}</span>
                  <Icon name="arrow" size={16} />
                </button>
              ))}
            </div>
          ) : (
            <div className="p1-board">
              {["To do", "Working on it", "Waiting", "Done"].map((s) => (
                <section key={s}>
                  <h3>
                    {s}
                    <span>
                      {
                        tasks.filter((t) => (status[t.id] ?? t.status) === s)
                          .length
                      }
                    </span>
                  </h3>
                  {tasks
                    .filter((t) => (status[t.id] ?? t.status) === s)
                    .map((t) => (
                      <button key={t.id} onClick={() => setSelected(t.id)}>
                        <b>{t.title}</b>
                        <span>{t.owner ?? "Needs owner"}</span>
                        <small>{shortDate(t.date)}</small>
                      </button>
                    ))}
                </section>
              ))}
            </div>
          )}
          {view === "list" && tasks.length > 5 && (
            <button
              className="p1-plain p1-more"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Show fewer steps" : `Show all ${tasks.length} steps`}
            </button>
          )}
          {current && (
            <section className="p1-task-detail" aria-label="Task details">
              <div className="p1-section-head">
                <h3>{current.title}</h3>
                <button className="p1-plain" onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>
              <dl>
                <div>
                  <dt>Owner</dt>
                  <dd>{current.owner ?? "Needs confirmation"}</dd>
                </div>
                <div>
                  <dt>Approver</dt>
                  <dd>{current.approver ?? "Not assigned"}</dd>
                </div>
                <div>
                  <dt>Support</dt>
                  <dd>{current.support.join(", ") || "Not assigned"}</dd>
                </div>
                <div>
                  <dt>Club deadline</dt>
                  <dd>{shortDate(current.date)} · Rule engine</dd>
                </div>
                <div>
                  <dt>Why this date</dt>
                  <dd>{current.dateReason}</dd>
                </div>
              </dl>
              <label className="p1-field">
                Task status
                <select
                  value={status[current.id] ?? current.status}
                  onChange={(e) =>
                    setStatus({ ...status, [current.id]: e.target.value })
                  }
                >
                  {["To do", "Working on it", "Waiting", "Done"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <p className="p1-caption">
                Status changes stay in this preview until you leave.
              </p>
            </section>
          )}
          <div className="p1-content-block">
            <h2>Materials & evidence</h2>
            <details>
              <summary>
                <Icon name="file" />{" "}
                {isMember
                  ? "Founder briefing · fictional outline"
                  : "School briefing · fictional notice"}
              </summary>
              <p>
                {isMember
                  ? "Purpose: connect 30 students with founders. Format: introductions, small-group discussions, then reflection. No contact details are stored."
                  : "Fictional requirement: nominate two representatives and save an attendance note. President-provided due date: November 4, 2026."}
              </p>
            </details>
            <details>
              <summary>
                <Icon name="check" />
                Completion evidence · not submitted
              </summary>
              <p>
                A reviewed completion note will belong to this activity. No
                participant names or attendance lists are collected in this
                preview.
              </p>
            </details>
          </div>
          <div className="p1-content-block">
            <h2>Handoff note</h2>
            <p>
              {approved
                ? "Approved preview decision: use the confirmed responsibility map. No unconfirmed AI suggestions or private conversations are included."
                : "No approved activity decisions yet. Confirmed lessons and evidence will appear here after review."}
            </p>
          </div>
        </section>
        <aside className="p1-work-side">
          <section>
            <span className="p1-overline">FUNDING NEED</span>
            <h3>{isMember ? "$120 estimated" : "No funding requested"}</h3>
            <p>
              {isMember
                ? "Fictional organization dues · materials only"
                : "Attendance coordination only"}
            </p>
            <dl>
              <div>
                <dt>Approval</dt>
                <dd>
                  {isMember ? "President review required" : "Not required"}
                </dd>
              </div>
              <div>
                <dt>Application</dt>
                <dd>{isMember ? "Not started" : "Not applicable"}</dd>
              </div>
              <div>
                <dt>Evidence</dt>
                <dd>{isMember ? "Quote not attached" : "Not applicable"}</dd>
              </div>
            </dl>
          </section>
          <section>
            <span className="p1-overline">WORKING WITH YOUR CONTEXT</span>
            <h3>Right work. Right role.</h3>
            <p>Campus organizations</p>
            <b>{owner(d, "relationships", "campus") ?? "Needs confirmation"}</b>
            <p>Companies & sponsors</p>
            <b>
              {override ??
                owner(d, "relationships", "companies") ??
                "Needs confirmation"}
            </b>
            <Link to="/phase1/setup" className="p1-text-link">
              Review organization
              <Icon name="arrow" size={16} />
            </Link>
          </section>
        </aside>
      </div>
      {review && (
        <section className="p1-review-plan" aria-label="Review plan">
          <div className="p1-section-head">
            <h2>Review this plan</h2>
            <button className="p1-plain" onClick={() => setReview(false)}>
              Close
            </button>
          </div>
          <p>
            {tasks.length} tasks belong to this activity. Owners follow the{" "}
            {active ? "confirmed" : "example"} context. All deadlines come from
            the rule engine.
          </p>
          <p className="p1-caption">
            This approves the local preview only. It does not create records in
            the legacy workspace.
          </p>
          <div className="p1-actions">
            <button
              className="p1-primary"
              disabled={tasks.some((t) => !t.owner)}
              onClick={() => {
                setApproved(true);
                setReview(false);
              }}
            >
              Approve preview
            </button>
            <button onClick={() => setReview(false)}>Reject plan</button>
            <Link to="/phase1/setup">Edit responsibilities</Link>
          </div>
        </section>
      )}
      <div className="p1-work-composer">
        <Composer
          compact
          placeholder="Ask Platypus about this activity…"
          onSubmit={(text) => {
            if (/company|sponsor|external/i.test(text) && missing) {
              setClarify(true);
              setReply(missing);
            } else
              setReply(
                isMember
                  ? `This preview starts with the standard member playbook. Company outreach: ${owner(d, "relationships", "companies") ?? "needs your confirmation"}. To change responsibilities, review organization setup.`
                  : `The short chain is: review notice → confirm representatives → share brief → record evidence. Staffing owner: ${owner(d, "staffing") ?? "needs your confirmation"}.`,
              );
          }}
        />
        {reply && (
          <div className="p1-reply" role="status">
            <Icon name="spark" />
            <div>
              <p>{reply}</p>
              {clarify && (
                <div className="p1-choices">
                  {d.roles.slice(0, 3).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setOverride(r.title);
                        setClarify(false);
                        setReply(
                          `Suggested owner: ${r.title}. Review organization setup to confirm this change.`,
                        );
                      }}
                    >
                      {r.title}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setClarify(false);
                      setReply(
                        "No owner assigned. Confirm a responsibility in organization setup.",
                      );
                    }}
                  >
                    Not sure — use the suggested option
                  </button>
                  <Link to="/phase1/setup">Add another option</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
