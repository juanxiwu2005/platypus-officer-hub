import { seedDemo } from "../data/seed";
import { buildEventNodes } from "../engine/playbooks";
import { computeSchedule } from "../engine/schedule";
import type { Node, RoleFunction } from "../data/types";
import {
  CAPABILITIES,
  type ActivityKind,
  type Assignment,
  type Draft,
  type PreviewTask,
  type Scope,
  type Source,
  type Suggestion,
} from "./model";

export function owners(
  d: Draft,
  capabilityId: string,
  scope: Scope = "all",
  responsibility: Assignment["responsibility"] = "owner",
) {
  const choices = d.assignments.filter(
    (a) =>
      a.capabilityId === capabilityId &&
      a.responsibility === responsibility &&
      a.confirmedByUser,
  );
  const exact = choices.filter((a) => a.scope === scope);
  return (exact.length ? exact : choices.filter((a) => a.scope === "all"))
    .map((a) => d.roles.find((r) => r.id === a.roleId))
    .filter((r): r is Draft["roles"][number] => !!r);
}
export function owner(d: Draft, capabilityId: string, scope: Scope = "all") {
  const rs = owners(d, capabilityId, scope);
  return rs.length === 1 ? rs[0].title : null;
}
export function setOwner(
  d: Draft,
  capabilityId: string,
  roleId: string,
  scope: Scope = "all",
  responsibility: Assignment["responsibility"] = "owner",
): Draft {
  if (roleId === "" && responsibility === "owner") {
    const broad = d.assignments.find(
      (a) =>
        a.capabilityId === capabilityId &&
        a.responsibility === "owner" &&
        a.scope === "all",
    );
    const remaining = d.assignments.filter(
      (a) =>
        !(
          a.capabilityId === capabilityId &&
          a.responsibility === "owner" &&
          (a.scope === scope || a.scope === "all")
        ),
    );
    if (broad && scope !== "all")
      remaining.push({
        ...broad,
        scope: scope === "campus" ? "companies" : "campus",
      });
    return { ...d, confirmed: false, assignments: remaining };
  }
  if (
    !d.roles.some((r) => r.id === roleId) ||
    !CAPABILITIES.some((c) => c.id === capabilityId)
  )
    return d;
  const assignments = d.assignments.filter(
    (a) =>
      !(
        a.capabilityId === capabilityId &&
        a.scope === scope &&
        a.responsibility === responsibility
      ),
  );
  return {
    ...d,
    confirmed: false,
    assignments: [
      ...assignments,
      {
        roleId,
        capabilityId,
        scope,
        responsibility,
        source: "manual",
        confirmedByUser: true,
        evidenceSourceId: null,
        confidence: null,
        notes: "Confirmed in the preview.",
      },
    ],
  };
}
export function classify(text: string): ActivityKind | null {
  if (
    /president.{0,15}meeting|school notice|service|involvement|tabling|board|obligation/i.test(
      text,
    )
  )
    return "executive_obligation";
  if (/speaker|workshop|social|recruit|member|network/i.test(text))
    return "member_activity";
  return null;
}
export function uncertainty(
  d: Draft,
  capability = "relationships",
  scope: Scope = "companies",
) {
  return owner(d, capability, scope)
    ? null
    : "Who should own company and sponsor relationships?";
}
export async function makeSource(
  text: string,
  fileName: string,
  organizationId: string,
): Promise<Source> {
  if (!text.trim() || text.length > 20000)
    throw new Error("Use a fictional text document of 1–20,000 characters.");
  if (
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b|(?:api[_ -]?key|password|secret)\s*[:=]/i.test(
      text,
    )
  )
    throw new Error(
      "Remove personal contact details or sensitive fields before using this fictional preview.",
    );
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return {
    organizationId,
    id: `source-${Array.from(new Uint8Array(hash))
      .slice(0, 6)
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")}`,
    type: "constitution",
    fileName,
    text,
    accessScope: "organization",
    createdAt: new Date().toISOString(),
    retentionPolicy: "demo_7_days",
    checksum: Array.from(new Uint8Array(hash))
      .map((n) => n.toString(16).padStart(2, "0"))
      .join(""),
    status: "draft",
  };
}
/** A conservative local parser demonstrates evidence review. It is explicitly not live AI extraction. */
export function extract(source: Source): Suggestion[] {
  const patterns: [RegExp, string, Scope][] = [
    [/The (.+?) approves organization plans[^.]*\./g, "compliance", "all"],
    [/The (.+?) plans member events[^.]*\./g, "planning", "all"],
    [/The (.+?) owns purchasing[^.]*\./g, "money", "all"],
    [/([A-Z][\w ]*?) owns promotion[^.]*\./g, "marketing", "all"],
    [
      /([A-Z][\w ]*?) owns relationships with campus organizations[^.]*\./g,
      "relationships",
      "campus",
    ],
    [
      /([A-Z][\w ]*?) owns relationships with companies[^.]*\./g,
      "relationships",
      "companies",
    ],
    [/The (.+?) maintains documentation[^.]*\./g, "documentation", "all"],
  ];
  return patterns.flatMap(([re, capabilityId, scope]) =>
    [...source.text.matchAll(re)].map((m, i) => ({
      id: `${capabilityId}-${scope}-${i}`,
      roleTitle: m[1].trim(),
      capabilityId,
      scope,
      quote: m[0],
      start: m.index!,
      end: m.index! + m[0].length,
      confidence: 0.9,
      decision: "pending" as const,
      edited: false,
    })),
  );
}
/** Rebuild an allowlisted object; reject forged evidence, unknown capabilities and invalid confidence. AI dates never cross this boundary. */
export function validateSuggestion(
  raw: unknown,
  source: Source,
): Suggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  if (
    typeof x.id !== "string" ||
    typeof x.roleTitle !== "string" ||
    !x.roleTitle.trim() ||
    x.roleTitle.length > 80 ||
    !CAPABILITIES.some((c) => c.id === x.capabilityId) ||
    !["all", "campus", "companies"].includes(String(x.scope)) ||
    typeof x.quote !== "string" ||
    !Number.isInteger(x.start) ||
    !Number.isInteger(x.end) ||
    Number(x.start) < 0 ||
    Number(x.end) <= Number(x.start) ||
    source.text.slice(Number(x.start), Number(x.end)) !== x.quote ||
    typeof x.confidence !== "number" ||
    !Number.isFinite(x.confidence) ||
    x.confidence < 0 ||
    x.confidence > 1
  )
    return null;
  return {
    id: x.id,
    roleTitle: x.roleTitle.trim(),
    capabilityId: String(x.capabilityId),
    scope: x.scope as Scope,
    quote: x.quote,
    start: Number(x.start),
    end: Number(x.end),
    confidence: x.confidence,
    decision: "pending",
    edited: false,
  };
}
export function reviewSuggestion(
  d: Draft,
  id: string,
  decision: "accepted" | "rejected",
  editedTitle?: string,
  editedCapability?: string,
): Draft {
  const s = d.suggestions.find((s) => s.id === id);
  if (!s || !d.source) return d;
  const title = editedTitle?.trim() || s.roleTitle;
  const cap = editedCapability ?? s.capabilityId;
  const scope = cap === "relationships" ? s.scope : "all";
  if (title.length > 80 || !CAPABILITIES.some((c) => c.id === cap)) return d;
  const suggestions = d.suggestions.map((s) =>
    s.id === id
      ? {
          ...s,
          roleTitle: title,
          capabilityId: cap,
          scope,
          decision,
          edited: !!editedTitle || !!editedCapability,
        }
      : s,
  );
  if (decision === "rejected") return { ...d, suggestions, confirmed: false };
  let role = d.roles.find((r) => r.title.toLowerCase() === title.toLowerCase());
  const roles = [...d.roles];
  if (!role) {
    role = { id: `role-source-${roles.length}`, title };
    roles.push(role);
  }
  // Accepted extraction remains a proposal when it conflicts with a confirmed manual assignment.
  if (owner({ ...d, roles }, cap, scope) === title)
    return { ...d, roles, suggestions, confirmed: false };
  const a: Assignment = {
    roleId: role.id,
    capabilityId: cap,
    scope,
    responsibility: "owner",
    source: "constitution",
    confirmedByUser: false,
    evidenceSourceId: d.source.id,
    confidence: s.confidence,
    notes:
      "Accepted suggestion; final mapping and organization confirmation still required.",
  };
  return {
    ...d,
    roles,
    suggestions,
    confirmed: false,
    assignments: [
      ...d.assignments.filter(
        (x) =>
          !(
            x.source === "constitution" &&
            x.capabilityId === s.capabilityId &&
            x.scope === s.scope
          ),
      ),
      a,
    ],
  };
}
export function conflicts(d: Draft) {
  return d.assignments
    .filter((a) => a.source === "constitution" && !a.confirmedByUser)
    .map((a) => ({
      assignment: a,
      suggested: d.roles.find((r) => r.id === a.roleId)?.title ?? "",
      current: owner(d, a.capabilityId, a.scope),
    }));
}
export function resolveSuggestion(
  d: Draft,
  a: Assignment,
  useSuggestion: boolean,
): Draft {
  const base = {
    ...d,
    confirmed: false,
    assignments: d.assignments.filter((x) => x !== a),
  };
  if (!useSuggestion) return base;
  const remaining = base.assignments.filter(
    (x) =>
      !(
        x.capabilityId === a.capabilityId &&
        x.responsibility === "owner" &&
        (x.scope === a.scope || (x.scope === "all" && a.scope !== "all"))
      ),
  );
  // Split the old all-scope owner into the untouched scope before replacing just one side.
  const broad = base.assignments.find(
    (x) =>
      x.capabilityId === a.capabilityId &&
      x.responsibility === "owner" &&
      x.scope === "all" &&
      x.confirmedByUser,
  );
  if (broad && a.scope !== "all")
    remaining.push({
      ...broad,
      scope: a.scope === "campus" ? "companies" : "campus",
    });
  return {
    ...base,
    assignments: [
      ...remaining,
      {
        ...a,
        confirmedByUser: true,
        notes: "Constitution suggestion explicitly confirmed.",
      },
    ],
  };
}
export function confirmContext(d: Draft): Draft {
  if (
    !d.name.trim() ||
    conflicts(d).length ||
    d.suggestions.some((s) => s.decision === "pending")
  )
    return d;
  return {
    ...d,
    confirmed: true,
    version: d.version + 1,
    lastReviewedAt: new Date().toISOString(),
    source: d.source ? { ...d.source, status: "reviewed" } : null,
  };
}
const LEGACY_CAP: Record<RoleFunction, string> = {
  president: "compliance",
  vice_president: "planning",
  programs: "planning",
  finance: "money",
  marketing: "marketing",
  outreach: "relationships",
  secretary: "documentation",
  advisor: "planning",
  membership: "staffing",
};
export function workflow(d: Draft, kind: ActivityKind): PreviewTask[] {
  const state = seedDemo(undefined, "v2");
  const event = {
    ...state.events[1],
    id: `preview-${kind}`,
    date: "2027-02-11",
    food: "none" as const,
    funding: "none" as const,
  };
  let nodes = buildEventNodes(event, []);
  if (kind === "executive_obligation") {
    const base = nodes[0];
    nodes = [
      ["notice", "Review the school notice", "compliance"],
      ["staff", "Confirm two board representatives", "staffing"],
      ["brief", "Share the attendance brief", "marketing"],
      ["evidence", "Record completion evidence", "documentation"],
    ].map(([key, title, cap], i) => ({
      ...base,
      id: `${event.id}:${key}`,
      title,
      eventId: null,
      stepKey: cap,
      dependsOn: i
        ? [`${event.id}:${["notice", "staff", "brief"][i - 1]}`]
        : [],
      anchor: { kind: "fixed" as const, club: "2026-11-04", official: null },
      estDays: 1,
      ruleIds: [],
      fn: "secretary" as const,
      source: "Fictional school notice · president-provided due date",
      status: "accepted" as const,
    }));
  }
  nodes = nodes.map((n) => {
    const cap =
      kind === "executive_obligation"
        ? n.stepKey!
        : n.stepKey === "staff"
          ? "staffing"
          : LEGACY_CAP[n.fn];
    const who = owners(d, cap, cap === "relationships" ? "companies" : "all");
    return { ...n, ownerId: who.length === 1 ? who[0].id : null };
  });
  const people = d.roles.map((r) => ({
    ...state.people[0],
    id: r.id,
    name: r.title,
    roleId: r.id,
    busyWeeks: [],
    personalBufferDays: 1,
    personalBufferEnabled: false,
  }));
  const schedule = computeSchedule({
    ...state,
    org: { ...state.org, id: d.organizationId },
    roles: [],
    people,
    events: kind === "member_activity" ? [event] : [],
    nodes,
  });
  return nodes.map((n) => {
    const cap =
      kind === "executive_obligation"
        ? n.stepKey!
        : n.stepKey === "staff"
          ? "staffing"
          : LEGACY_CAP[n.fn];
    const plan = schedule.nodes[n.id];
    return {
      id: n.id,
      activityId: event.id,
      title: n.title,
      capabilityId: cap,
      owner: owner(d, cap, cap === "relationships" ? "companies" : "all"),
      approver: owners(d, cap, "all", "approver")[0]?.title ?? null,
      support: owners(d, cap, "all", "support").map((r) => r.title),
      date: plan?.club ?? null,
      dateReason: plan?.explain.club ?? "Needs a confirmed anchor.",
      status: "To do",
      risk: !n.ownerId ? "Needs an owner" : null,
    };
  });
}
/** Preview-only migration inspection. Never reads or overwrites the legacy localStorage key. */
export function inspectMigration(
  nodes: Pick<Node, "id" | "eventId" | "title">[],
) {
  return nodes.map((n) => ({
    legacyId: n.id,
    activityId: n.eventId
      ? `member:${n.eventId}`
      : n.title.trim()
        ? `executive:${n.id}`
        : null,
    kind: n.eventId ? "member_activity" : "executive_obligation",
    reviewRequired: !n.title.trim(),
    original: { ...n },
  }));
}
export function assertTask(
  task: { activityId?: string },
  activities: string[],
) {
  if (!task.activityId || !activities.includes(task.activityId))
    throw new Error("Choose an activity before adding a task.");
  return true;
}
export function handoffMemory(
  entries: {
    text: string;
    confirmed: boolean;
    access: "organization" | "private";
  }[],
) {
  return entries
    .filter((e) => e.confirmed && e.access === "organization")
    .map((e) => e.text);
}
