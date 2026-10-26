import { describe, it, expect } from "vitest";
import { parseJSONReply } from "../../netlify/lib/ai.mts";
import {
  upgrade,
  reconcile,
  scopeKey,
  applyChanges,
  compileOrganization,
  mergeConstitution,
} from "./setupLogic";
import { fixtureDraft, fixtureFlow } from "./testing/fixtures";
import { validateV3, v3Request } from "../../netlify/lib/organization/v3.mts";
import type { OrgChange } from "./schema";
function state() {
  const d = upgrade(fixtureDraft());
  d.memberFlow = fixtureFlow(d);
  return d;
}
describe("JSON extraction without inventing missing content", () => {
  for (const input of [
    '```json\n{"x":"a } b","v":true}\n```',
    'Here is the result:\n{"x":"a } b","v":true}\nFinished.',
    '<think>I should return JSON {example}</think>\n{"x":"a } b","v":true}',
  ])
    it(
      "accepts a complete object with supported wrappers " + input.slice(0, 10),
      () => expect(parseJSONReply(input)).toEqual({ x: "a } b", v: true }),
    );
  for (const input of [
    '{"roles":[',
    '{"ok":true} {"different":true}',
    '<think>unfinished {"ok":true}',
    '{"roles":[{"id":"a"}',
  ])
    it("rejects truncation or ambiguous objects " + input, () =>
      expect(() => parseJSONReply(input)).toThrow(),
    );
  it("handles quotes and escaped backslashes in JSON strings", () => {
    const value = { text: 'say "hi" \\ { brace }' };
    expect(parseJSONReply("Result: " + JSON.stringify(value))).toEqual(value);
  });
});
describe("preservation and incremental setup", () => {
  it("keeps downstream duties and graphs after department colors, positions and title edits", () => {
    const d = state(),
      next = applyChanges(d, [
        {
          entity: "role",
          id: "marketing",
          operation: "set",
          field: "title",
          value: "VP of Communication",
        },
      ]);
    expect(next.memberFlow).toEqual(d.memberFlow);
    expect(
      next.roles.find((r) => r.id === "marketing")?.responsibilities,
    ).toEqual(d.roles.find((r) => r.id === "marketing")?.responsibilities);
    const color = {
      ...next,
      departments: next.departments.map((dep) => ({
        ...dep,
        color: "#123456",
      })),
    };
    expect(scopeKey(color, "risk_check")).toBe(scopeKey(next, "risk_check"));
  });
  it("removes only missing role references and flags affected workflow owners", () => {
    const d = state();
    const before = d.memberFlow!;
    const next = applyChanges(d, [
      {
        entity: "role",
        id: "marketing",
        operation: "remove",
        field: "title",
        value: null,
      },
    ]);
    expect(next.memberFlow?.nodes).toHaveLength(before.nodes.length);
    expect(
      next.memberFlow?.nodes.every((n) => !n.roleIds.includes("marketing")),
    ).toBe(true);
    expect(
      next.memberFlow?.nodes.filter((n) => n.needsReview).length,
    ).toBeGreaterThan(0);
    expect(next.roles.find((r) => r.id === "finance")).toEqual(
      d.roles.find((r) => r.id === "finance"),
    );
  });
  it("rejects hierarchy cycles and unknown departments without changing the draft", () => {
    const d = state(),
      snapshot = structuredClone(d);
    expect(() =>
      applyChanges(d, [
        {
          entity: "role",
          id: "president",
          operation: "set",
          field: "parentRoleId",
          value: "marketing",
        },
      ]),
    ).toThrow("loop");
    expect(() =>
      applyChanges(d, [
        {
          entity: "role",
          id: "marketing",
          operation: "set",
          field: "departmentId",
          value: "missing",
        },
      ]),
    ).toThrow();
    expect(d).toEqual(snapshot);
  });
  it("merges new extraction using stable IDs and preserves manual duties and downstream work", () => {
    const d = applyChanges(state(), [
      {
        entity: "role",
        id: "marketing",
        operation: "set",
        field: "responsibilities",
        value: ["My approved duty"],
      },
    ]);
    const extracted = {
      departments: d.departments,
      roles: d.roles.map((r) => ({
        ...r,
        id: r.id === "marketing" ? "new_marketing" : r.id,
        responsibilities: ["AI replacement"],
      })),
    };
    const n = mergeConstitution(d, extracted);
    expect(n.roles.find((r) => r.id === "marketing")?.responsibilities).toEqual(
      ["My approved duty"],
    );
    expect(n.roles.some((r) => r.id === "new_marketing")).toBe(false);
    expect(n.memberFlow?.nodes.map((n) => n.title)).toEqual(
      d.memberFlow?.nodes.map((n) => n.title),
    );
  });
  it("carries legacy configuration forward without deleting the old board workflow", () => {
    const original = fixtureDraft();
    original.boardFlow = fixtureFlow(original, true);
    expect(upgrade(original).boardFlow).toEqual(original.boardFlow);
  });
  it("requires a completed or explicit skipped check, then compiles JSON with two retrieval levels", () => {
    const d = state();
    expect(() => compileOrganization(d)).toThrow("check");
    d.riskCheck = {
      status: "skipped",
      inputKey: scopeKey(d, "risk_check"),
      risks: [],
      answers: {},
      at: new Date().toISOString(),
    };
    const compiled = compileOrganization(d);
    expect(JSON.parse(JSON.stringify(compiled)).alwaysRead.roles).toHaveLength(
      d.roles.length,
    );
    expect(compiled.onDemand.boardWork.mode).toBe("generate-per-request");
    expect(
      compiled.onDemand.memberWorkflow.raci.every(
        (n) => n.accountable === null,
      ),
    ).toBe(true);
    expect(compiled.unresolved).toHaveLength(1);
  });
  it("does not repeat full documents or workflow coordinates in the interactive context", () => {
    const d = state();
    const edit = v3Request(d, "edit", "Rename Marketing");
    expect(JSON.stringify(edit.input)).not.toContain(d.source!.text);
    expect(JSON.stringify(edit.input)).not.toContain('"position"');
    expect(
      v3Request(d, "constitution", "").responseSchema?.additionalProperties,
    ).toBe(false);
  });
  it("validates AI patches before they can be approved", () => {
    const d = state();
    const changes: OrgChange[] = [
      {
        entity: "role",
        id: "marketing",
        operation: "set",
        field: "parentRoleId",
        value: "missing",
      },
    ];
    expect(() =>
      validateV3("edit", { message: "Move role", question: null, changes }, d),
    ).toThrow();
    expect(() =>
      validateV3(
        "edit",
        { message: "Clarify", question: "Which role?", changes },
        d,
      ),
    ).toThrow("Clarification");
  });
  it("allows a healthy check to report no invented issues", () =>
    expect(validateV3("risk_check", { risks: [] }, state())).toEqual({
      risks: [],
    }));
  it("updates only affected workflow review markers after a duty edit", () => {
    const d = state(),
      n = structuredClone(d);
    n.roles.find((r) => r.id === "finance")!.responsibilities = ["New scope"];
    const after = reconcile(d, n);
    expect(
      after.memberFlow?.nodes
        .filter((n) => n.needsReview)
        .every((n) => n.roleIds.includes("finance")),
    ).toBe(true);
  });
});

describe("combining risk decisions", () => {
  it("keeps both independently selected additions to the same role", async () => {
    const { selectedRiskChanges } = await import("./setupLogic");
    const d = state();
    const base = d.roles.find((r) => r.id === "finance")!.responsibilities;
    d.riskCheck.risks = ["one", "two"].map((id, i) => ({
      id,
      title: "Material risk",
      explanation: "Ownership needs clarification",
      roleIds: ["finance"],
      options: [
        {
          id: "fix",
          label: "Add duty",
          changes: [
            {
              entity: "role",
              id: "finance",
              operation: "set",
              field: "responsibilities",
              value: [...base, `Additional duty ${i}`],
            },
          ],
        },
        { id: "keep", label: "Keep", changes: [] },
      ],
    }));
    d.riskCheck.answers = { one: "fix", two: "fix" };
    const next = applyChanges(d, selectedRiskChanges(d));
    expect(
      next.roles.find((r) => r.id === "finance")?.responsibilities,
    ).toEqual([...base, "Additional duty 0", "Additional duty 1"]);
  });
});

describe("observed AIR response compatibility", () => {
  it("validates the observed organization wrapper and exact role aliases without another model call", () => {
    const d = upgrade(fixtureDraft());
    const raw = {
      organization: {
        name: d.name,
        mission: d.mission,
        departments: d.departments.map(({ id, name }) => ({
          id,
          name,
          source: "inferred",
        })),
        roles: d.roles.map((r) => ({
          id: r.id,
          name: r.title,
          department_id: r.departmentId,
          description: r.description,
          duties: r.responsibilities,
          quotes: [r.quote],
          source: r.source,
        })),
        uncertainties: [],
      },
    };
    const out = validateV3("constitution", raw, d) as { roles: typeof d.roles };
    expect(out.roles.map((r) => r.title)).toEqual(d.roles.map((r) => r.title));
    expect(out.roles.map((r) => r.responsibilities)).toEqual(
      d.roles.map((r) => r.responsibilities),
    );
    expect(out.roles.every((r) => r.parentRoleId === null)).toBe(true);
  });
  it("does not replace missing duties with guessed defaults", () => {
    const d = upgrade(fixtureDraft());
    const raw = {
      name: d.name,
      mission: d.mission,
      departments: d.departments,
      roles: d.roles.map(({ responsibilities: _, ...r }) => r),
      uncertainties: [],
    };
    expect(() => validateV3("constitution", raw, d)).toThrow();
  });
});
