import {
  DEPARTMENTS,
  DraftSchema,
  DepartmentSchema,
  RiskResultSchema,
  EditSchema,
  type SetupDraft,
  type Department,
  type OrgRole,
  type OrgFlow,
  type OrgChange,
  type Stage,
} from "./schema";
import { blankDraft } from "./presets";
import { graphError, removeStep } from "./graph";
export const COLORS = [
  "#3B6CC8",
  "#14857B",
  "#A86C25",
  "#8A58B4",
  "#C45565",
  "#617486",
];
export type SetupV3 = SetupDraft & {
  uiVersion: 3;
  departments: Department[];
  messages: NonNullable<SetupDraft["messages"]>;
  riskCheck: NonNullable<SetupDraft["riskCheck"]>;
  generated: Record<string, string>;
};
export const now = () => new Date().toISOString();
export function stable(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ":" + stable(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value) ?? "null";
}
export function upgrade(raw: SetupDraft = blankDraft()): SetupV3 {
  const d = DraftSchema.parse(raw),
    used = new Set(d.roles.map((r) => r.departmentId));
  const departments = d.departments?.length
    ? d.departments
    : DEPARTMENTS.filter((x) => used.has(x.id)).map((x, i) => ({
        id: x.id,
        name: x.name,
        color: COLORS[i % COLORS.length],
        source: "inferred" as const,
        quote: "",
      }));
  for (const r of d.roles)
    if (d.uiVersion !== 3 && !departments.some((x) => x.id === r.departmentId))
      departments.push({
        id: r.departmentId,
        name: r.departmentId.replace(/_/g, " "),
        color: COLORS[departments.length % COLORS.length],
        source: "inferred",
        quote: "",
      });
  const president = d.roles.find(
    (r) => /president|chair/i.test(r.title) && !/vice|co-/i.test(r.title),
  );
  const roles = d.roles.map((r, i) => ({
    ...r,
    description: r.description ?? r.responsibilities.slice(0, 2).join(". "),
    parentRoleId:
      r.parentRoleId === undefined
        ? r.id !== president?.id
          ? (president?.id ?? null)
          : null
        : r.parentRoleId,
    position: r.position ?? { x: (i % 3) * 280, y: Math.floor(i / 3) * 220 },
    manualFields: r.manualFields ?? [],
  }));
  return migrateReviewedCheck({
    ...d,
    uiVersion: 3,
    departments,
    roles,
    step: Math.min(d.step, 4),
    messages: d.messages ?? [],
    riskCheck: d.riskCheck ?? {
      status: "unreviewed",
      inputKey: "",
      risks: [],
      answers: {},
      at: null,
    },
    generated: d.generated ?? {},
  });
}
export function roleContext(d: SetupV3) {
  return [...d.roles]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((r) => ({
      id: r.id,
      title: r.title,
      departmentId: r.departmentId,
      parentRoleId: r.parentRoleId ?? null,
      description: r.description ?? "",
      responsibilities: r.responsibilities,
    }));
}
export function scopeKey(d: SetupV3, stage: Stage): string {
  if (stage === "constitution")
    return stable({ source: d.source?.checksum ?? "none" });
  return stable({
    // Labels, colors, layout and the source filename do not change ownership.
    // Re-reading a document changes this key only when its reviewed meaning changes.
    semanticsVersion: 2,
    mission: semanticText(d.mission),
    roles: [...d.roles]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((r) => ({ id: r.id, ...roleMeaning(r) })),
  });
}
/** Carry forward only a review proven to match the exact pre-v2 scope format.
 * This helper does not parse form fields, so it can also handle local drafts
 * containing a temporary empty title without discarding the user's input.
 */
export function migrateReviewedCheck(d: SetupV3): SetupV3 {
  if (!["complete", "skipped"].includes(d.riskCheck.status)) return d;
  const legacyKey = stable({
    organization: { name: d.name, mission: d.mission },
    roles: roleContext(d),
    departments: d.departments
      .map(({ id, name }) => ({ id, name }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    source: d.source?.checksum ?? "none",
  });
  if (d.riskCheck.inputKey !== legacyKey) return d;
  const inputKey = scopeKey(d, "risk_check");
  return {
    ...d,
    riskCheck: { ...d.riskCheck, inputKey },
    generated: d.generated.risk_check === legacyKey
      ? { ...d.generated, risk_check: inputKey }
      : d.generated,
  };
}
function semanticText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}
function roleMeaning(role: OrgRole) {
  return {
    departmentId: role.departmentId,
    parentRoleId: role.parentRoleId ?? null,
    description: semanticText(role.description ?? ""),
    responsibilities: [...new Set(role.responsibilities.map(semanticText))].sort(),
  };
}
export function hierarchyError(roles: OrgRole[]): string | null {
  const by = new Map(roles.map((r) => [r.id, r]));
  for (const r of roles) {
    let p = r.parentRoleId,
      seen = new Set([r.id]);
    while (p) {
      if (seen.has(p)) return "This reporting line creates a loop.";
      if (!by.has(p)) return "A reporting line refers to a missing role.";
      seen.add(p);
      p = by.get(p)?.parentRoleId;
    }
  }
  return null;
}
export function validateStructure(d: SetupV3) {
  if (new Set(d.roles.map((x) => x.id)).size !== d.roles.length)
    throw new Error("Roles need unique IDs.");
  if (new Set(d.departments.map((x) => x.id)).size !== d.departments.length)
    throw new Error("Departments need unique IDs.");
  if (d.roles.some((r) => !d.departments.some((x) => x.id === r.departmentId)))
    throw new Error("Every role needs an existing department.");
  const h = hierarchyError(d.roles);
  if (h) throw new Error(h);
  if (d.memberFlow) {
    const e = graphError(d.memberFlow.nodes);
    if (e) throw new Error(e);
    if (
      d.memberFlow.nodes.some((n) =>
        n.roleIds.some((id) => !d.roles.some((r) => r.id === id)),
      )
    )
      throw new Error("Choose existing roles for each workflow step.");
    if (
      d.memberFlow.nodes.some((n) => n.accountableRoleId &&
        !d.roles.some((r) => r.id === n.accountableRoleId))
    )
      throw new Error("Choose an existing accountable role for each workflow step.");
  }
  return d;
}
export function reconcile(before: SetupV3, next: SetupV3): SetupV3 {
  const roleIds = new Set(next.roles.map((r) => r.id));
  const changed = new Set(
    before.roles
      .filter((r) => {
        const n = next.roles.find((x) => x.id === r.id);
        return !n || stable(roleMeaning(r)) !== stable(roleMeaning(n));
      })
      .map((r) => r.id),
  );
  const missionChanged =
    semanticText(before.mission) !== semanticText(next.mission);
  const cleanFlow = (flow: OrgFlow | null) => {
    if (!flow) return null;
    // Only a lost prerequisite owner requires its immediate consumers to review
    // their handoff. A wording change does not invalidate every descendant.
    const lostOwner = new Set(
      flow.nodes
        .filter((n) => n.roleIds.length > 0 &&
          n.roleIds.every((id) => !roleIds.has(id)))
        .map((n) => n.id),
    );
    return {
      ...flow,
      nodes: flow.nodes.map((n) =>
        missionChanged ||
        n.roleIds.some((id) => changed.has(id)) ||
        (n.accountableRoleId && changed.has(n.accountableRoleId)) ||
        (n.dependsOn.length > 0 && (n.dependencyMode === "all"
          ? n.dependsOn.some((id) => lostOwner.has(id))
          : n.dependsOn.every((id) => lostOwner.has(id))))
          ? {
              ...n,
              roleIds: n.roleIds.filter((id) => roleIds.has(id)),
              ...(n.accountableRoleId && !roleIds.has(n.accountableRoleId)
                ? { accountableRoleId: null }
                : {}),
              needsReview: true,
            }
          : n,
      ),
      raci: flow.raci.map((row) => ({
        ...row,
        responsible: row.responsible.filter((id) => roleIds.has(id)),
        accountable:
          row.accountable && roleIds.has(row.accountable)
            ? row.accountable
            : null,
        consulted: row.consulted.filter((id) => roleIds.has(id)),
        informed: row.informed.filter((id) => roleIds.has(id)),
      })),
    };
  };
  return {
    ...next,
    roles: next.roles.map((r) => ({
      ...r,
      parentRoleId:
        r.parentRoleId && roleIds.has(r.parentRoleId) ? r.parentRoleId : null,
    })),
    assignments: next.assignments.map((a) => ({
      ...a,
      roleIds: a.roleIds.filter((id) => roleIds.has(id)),
    })),
    memberFlow: cleanFlow(next.memberFlow),
    boardFlow: cleanFlow(next.boardFlow),
    confirmed: false,
  };
}
export function mergeConstitution(
  d: SetupV3,
  out: {
    name?: string;
    mission?: string;
    departments: Department[];
    roles: OrgRole[];
    uncertainties?: string[];
  },
): SetupV3 {
  const departments = [...d.departments];
  const deptMap = new Map<string, string>();
  for (const dep of out.departments) {
    const match = departments.find(
      (x) => x.id === dep.id || x.name.toLowerCase() === dep.name.toLowerCase(),
    );
    deptMap.set(dep.id, match?.id ?? dep.id);
    if (!match) departments.push(dep);
  }
  const roles = [...d.roles],
    idMap = new Map<string, string>();
  for (const role of out.roles) {
    const quoteMatches = roles.filter((x) => x.quote && x.quote === role.quote);
    const match =
      roles.find((x) => x.id === role.id) ??
      roles.find((x) => x.title.toLowerCase() === role.title.toLowerCase()) ??
      (quoteMatches.length === 1 ? quoteMatches[0] : undefined);
    idMap.set(role.id, match?.id ?? role.id);
  }
  for (const role of out.roles) {
    const id = idMap.get(role.id)!,
      old = roles.find((x) => x.id === id),
      next = {
        ...role,
        id,
        departmentId: deptMap.get(role.departmentId) ?? role.departmentId,
        parentRoleId: role.parentRoleId
          ? (idMap.get(role.parentRoleId) ?? role.parentRoleId)
          : null,
      };
    if (old) {
      const manual = new Set(
        old.manualFields?.length
          ? old.manualFields
          : old.source === "manual"
            ? [
                "title",
                "description",
                "departmentId",
                "parentRoleId",
                "responsibilities",
              ]
            : [],
      );
      const merged = {
        ...old,
        ...next,
        position: old.position,
        manualFields: old.manualFields,
      };
      for (const field of manual)
        (merged as Record<string, unknown>)[field] = (
          old as Record<string, unknown>
        )[field];
      roles[roles.indexOf(old)] = merged;
    } else roles.push(next);
  }
  return validateStructure(
    reconcile(
      d,
      upgrade({
        ...d,
        departments,
        roles,
        mission: d.mission || out.mission || "",
        uncertainties: out.uncertainties ?? d.uncertainties,
      }),
    ),
  );
}
export function layoutFlow(flow: OrgFlow): OrgFlow {
  const by = new Map(flow.nodes.map((n) => [n.id, n])),
    ranks = new Map<string, number>();
  const rank = (id: string): number => {
    if (ranks.has(id)) return ranks.get(id)!;
    const n = by.get(id);
    const r = n?.dependsOn.length ? Math.max(...n.dependsOn.map(rank)) + 1 : 0;
    ranks.set(id, r);
    return r;
  };
  if (graphError(flow.nodes)) return flow;
  const counts = new Map<number, number>();
  return {
    ...flow,
    nodes: flow.nodes.map((n) => {
      const r = rank(n.id),
        i = counts.get(r) ?? 0;
      counts.set(r, i + 1);
      return { ...n, position: { x: r * 300, y: i * 200 } };
    }),
  };
}
export function applyChanges(d: SetupV3, changes: OrgChange[]): SetupV3 {
  let n = structuredClone(d);
  for (const c of changes) {
    if (c.entity === "role") {
      if (c.operation === "add") {
        if (n.roles.some((r) => r.id === c.id))
          throw new Error("Role already exists.");
        n.roles.push({
          id: c.id,
          title: String(c.value || "New role"),
          description: "",
          departmentId: "",
          parentRoleId: null,
          responsibilities: [],
          source: "manual",
          quote: "",
          confidence: 1,
          manualFields: ["title"],
        });
      } else if (c.operation === "remove") {
        if (!n.roles.some((r) => r.id === c.id))
          throw new Error("Role not found.");
        n.roles = n.roles
          .filter((r) => r.id !== c.id)
          .map((r) =>
            r.parentRoleId === c.id ? { ...r, parentRoleId: null } : r,
          );
      } else {
        const r = n.roles.find((r) => r.id === c.id);
        if (!r) throw new Error("Role not found.");
        if (
          ![
            "title",
            "description",
            "departmentId",
            "parentRoleId",
            "responsibilities",
          ].includes(c.field)
        )
          throw new Error("Invalid role change.");
        if (c.field === "responsibilities" && !Array.isArray(c.value))
          throw new Error("Duties must be a list.");
        (r as Record<string, unknown>)[c.field] = c.value;
        r.manualFields = [...new Set([...(r.manualFields ?? []), c.field])];
      }
    } else if (c.entity === "department") {
      if (c.operation === "add") {
        if (n.departments.some((x) => x.id === c.id))
          throw new Error("Department already exists.");
        n.departments.push({
          id: c.id,
          name: String(c.value),
          color: COLORS[n.departments.length % COLORS.length],
          source: "manual",
          quote: "",
        });
      } else if (c.operation === "remove") {
        if (n.roles.some((r) => r.departmentId === c.id))
          throw new Error("Move its roles before removing a department.");
        n.departments = n.departments.filter((x) => x.id !== c.id);
      } else {
        const dep = n.departments.find((x) => x.id === c.id);
        if (!dep || !["name", "color"].includes(c.field))
          throw new Error("Invalid department change.");
        (dep as Record<string, unknown>)[c.field] = c.value;
        DepartmentSchema.parse(dep);
      }
    } else {
      if (!n.memberFlow) throw new Error("No activity workflow exists yet.");
      if (c.operation === "add") {
        if (n.memberFlow.nodes.some((x) => x.id === c.id))
          throw new Error("Step already exists.");
        n.memberFlow.nodes.push({
          id: c.id,
          title: String(c.value),
          description: "",
          roleIds: [],
          actionIds: [],
          dependsOn: [],
          dependencyMode: "all",
          position: { x: 0, y: 0 },
          basis: "Approved AI proposal",
        });
      } else if (c.operation === "remove")
        n.memberFlow = removeStep(n.memberFlow, c.id);
      else {
        const node = n.memberFlow.nodes.find((x) => x.id === c.id);
        if (
          !node ||
          ![
            "title",
            "description",
            "roleIds",
            "dependsOn",
            "dependencyMode",
          ].includes(c.field)
        )
          throw new Error("Invalid step change.");
        if (
          ["roleIds", "dependsOn"].includes(c.field) &&
          !Array.isArray(c.value)
        )
          throw new Error("Choose a list of existing IDs.");
        (node as Record<string, unknown>)[c.field] = c.value;
      }
    }
  }
  const hierarchy = hierarchyError(n.roles);
  if (hierarchy) throw new Error(hierarchy);
  if (
    n.roles.some((r) => !n.departments.some((dep) => dep.id === r.departmentId))
  )
    throw new Error("Every role needs an existing department.");
  n = reconcile(d, upgrade(DraftSchema.parse(n)));
  return validateStructure(n);
}
export function hasReviewedCheck(d: SetupV3) {
  return (
    ["complete", "skipped"].includes(d.riskCheck.status) &&
    d.riskCheck.inputKey === scopeKey(d, "risk_check")
  );
}
export function compileOrganization(draft: SetupDraft) {
  const d = validateStructure(upgrade(draft));
  if (!d.roles.length || !d.departments.length || !d.memberFlow)
    throw new Error(
      "Review your departments, roles and activity workflow first.",
    );
  if (!hasReviewedCheck(d))
    throw new Error(
      "Complete or explicitly skip the responsibility check first.",
    );
  const pending = d.memberFlow.nodes.filter((n) => n.needsReview);
  if (pending.length)
    throw new Error(
      `Review the affected activity steps before confirming: ${pending
        .slice(0, 3).map((n) => n.title).join(", ")}. Mark each reviewed after deciding whether to keep or change it.`,
    );
  const compiled = {
    format: "platypus.organization",
    schemaVersion: 1,
    compiledAt: now(),
    contextVersion: d.contextVersion + 1,
    alwaysRead: {
      organization: { name: d.name, mission: d.mission },
      departments: d.departments.map(({ id, name, color }) => ({
        id,
        name,
        color,
      })),
      roles: roleContext(d),
      decisions: {
        responsibilityCheck: d.riskCheck.status,
        dates: "deterministic-rule-engine",
        changes: "human-approval-required",
      },
    },
    onDemand: {
      timingDefaults: d.timingDefaults ?? { itemsWeeks: 8, quotesWeeks: 7, budgetWeeks: 6 },
      constitution: {
        archiveId: d.source?.archiveId ?? null,
        checksum: d.source?.checksum ?? null,
      },
      memberWorkflow: {
        ...d.memberFlow,
        raci: d.memberFlow.nodes.map((n) => ({
          nodeId: n.id,
          responsible: n.roleIds,
          accountable: n.accountableRoleId ?? null,
          consulted: [],
          informed: [],
        })),
      },
      boardWork: {
        mode: "generate-per-request",
        templates: ["social", "tabling"],
      },
    },
    unresolved: [
      ...(d.riskCheck.status === "skipped"
        ? ["Responsibility check was skipped by the user."] : []),
      ...d.memberFlow.nodes.filter((n) => n.roleIds.length === 0)
        .map((n) => `No responsible role assigned to activity step ${n.id}: ${n.title}`),
    ],
  };
  return compiled;
}
export { RiskResultSchema, EditSchema };

/** Compose separately reviewed duty fixes relative to the original list, preserving unrelated selected fixes. */
export function selectedRiskChanges(d: SetupV3): OrgChange[] {
  const changes = d.riskCheck.risks.flatMap(
    (r) =>
      r.options.find((o) => o.id === d.riskCheck.answers[r.id])?.changes ?? [],
  );
  const grouped = new Map<string, OrgChange[]>();
  const result: OrgChange[] = [];
  for (const c of changes) {
    if (
      c.entity === "role" &&
      c.operation === "set" &&
      c.field === "responsibilities"
    ) {
      grouped.set(c.id, [...(grouped.get(c.id) ?? []), c]);
    } else result.push(c);
  }
  for (const [id, list] of grouped) {
    const base = d.roles.find((r) => r.id === id)?.responsibilities ?? [];
    const removed = new Set(
      list.flatMap((c) =>
        base.filter((x) => !((c.value as string[]) ?? []).includes(x)),
      ),
    );
    const added = list.flatMap((c) =>
      (c.value as string[]).filter((x) => !base.includes(x)),
    );
    result.push({
      ...list[0],
      value: [...base.filter((x) => !removed.has(x)), ...new Set(added)],
    });
  }
  return result;
}
