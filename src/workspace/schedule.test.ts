import { describe, expect, it } from "vitest";
import {
  GateSchema,
  FundingSchema,
  MemberSchema,
  TaskSchema,
  WorkItemSchema,
  type WorkItem,
  type WorkTask,
} from "./contracts";
import {
  milestoneTarget,
  registrationRequired,
  scheduleWorkItem,
  SCHEDULE_CALENDAR,
} from "./schedule";

const members = [
  MemberSchema.parse({
    id: "alex",
    name: "Alex",
    roleIds: ["president"],
    access: "manager",
    bufferDays: 1,
  }),
];
function task(id: string, patch: Partial<WorkTask> = {}): WorkTask {
  return TaskSchema.parse({
    id,
    parentWorkItemId: "event",
    title: id,
    stageKey: "prepare",
    stageTitle: "Prepare event",
    roleIds: ["president"],
    ownerId: "alex",
    updatedAt: "2026-10-26T12:00:00Z",
    ...patch,
  });
}
function item(tasks: WorkTask[], patch: Partial<WorkItem> = {}): WorkItem {
  return WorkItemSchema.parse({
    id: "event",
    name: "Fictional event",
    kind: "member_event",
    venue: "offcampus",
    date: "2026-11-19",
    ownerId: "alex",
    templateVersion: 3,
    tasks,
    createdAt: "2026-10-26T12:00:00Z",
    updatedAt: "2026-10-26T12:00:00Z",
    ...patch,
  });
}
const relative = (
  days: number,
  unit: "calendar" | "business" = "calendar",
) => ({ offsetDays: days, unit, source: "manual" as const });

describe("organization timing stays separate from ASU constraints", () => {
  it("provides 8/7/6-week completion targets with stable milestone keys", () => {
    const tasks = [
      task("items", { relativeTarget: milestoneTarget("items") }),
      task("quotes", {
        relativeTarget: milestoneTarget("confirm_quotes"),
        dependsOn: ["items"],
      }),
      task("budget", {
        relativeTarget: milestoneTarget("submit_budget_request"),
        dependsOn: ["quotes"],
      }),
    ];
    const schedule = scheduleWorkItem(item(tasks), members);
    expect([
      schedule.tasks.items.due,
      schedule.tasks.quotes.due,
      schedule.tasks.budget.due,
    ]).toEqual(["2026-09-24", "2026-10-01", "2026-10-08"]);
    expect(schedule.tasks.items.start).toBe("2026-09-22");
    expect(
      Object.values(schedule.tasks).every((t) => t.official === null),
    ).toBe(true);
    expect(schedule.covered).toBe(true);
    expect(milestoneTarget("other")).toBeNull();
  });
  it("respects changed organization timing and direct manual offsets", () => {
    const target = milestoneTarget("budget_request", {
      itemsWeeks: 5,
      quotesWeeks: 4,
      budgetWeeks: 3,
    });
    expect(target?.offsetDays).toBe(21);
    const schedule = scheduleWorkItem(
      item([task("budget", { relativeTarget: target })]),
      members,
    );
    expect(schedule.tasks.budget.due).toBe("2026-10-29");
    const manual = scheduleWorkItem(
      item([task("budget", { relativeTarget: relative(28) })]),
      members,
    );
    expect(manual.tasks.budget.due).toBe("2026-10-22");
  });
  it("preserves the independent R09 deadline while choosing the earlier internal target", () => {
    const schedule = scheduleWorkItem(
      item([
        task("budget", {
          relativeTarget: relative(42),
          officialRules: [{ ruleId: "R09", days: 10, unit: "business" }],
        }),
      ]),
      members,
    );
    expect(schedule.tasks.budget.official).toBe("2026-11-04");
    expect(schedule.tasks.budget.due).toBe("2026-10-08");
    expect(schedule.tasks.budget.basis).toContain("ASU R09");
    expect(schedule.tasks.budget.basis).toContain("42 calendar");
  });
  it("does not let a late internal target or a forged official anchor move ASU deadlines", () => {
    const schedule = scheduleWorkItem(
      item([
        task("budget", {
          relativeTarget: relative(2),
          officialRules: [{ ruleId: "R09", days: 1, unit: "calendar" }],
        }),
      ]),
      members,
    );
    expect(schedule.tasks.budget.official).toBe("2026-11-04");
    expect(schedule.tasks.budget.due).toBe("2026-10-30");
    expect(schedule.tasks.budget.issues.join(" ")).toContain(
      "official_rule_protected",
    );
  });
  it("uses school business days across Veterans Day and keeps speaker timing distinct", () => {
    const schedule = scheduleWorkItem(
      item([
        task("food", {
          officialRules: [{ ruleId: "R09", days: 10, unit: "business" }],
        }),
        task("speaker", {
          officialRules: [{ ruleId: "R10", days: 14, unit: "business" }],
        }),
      ]),
      members,
    );
    expect(schedule.tasks.food.official).toBe("2026-11-04");
    expect(schedule.tasks.speaker.official).toBe("2026-10-29");
    expect(schedule.tasks.speaker.due).toBe("2026-10-26");
  });
  it("adapts R01 to school-funded off-campus events without using titles", () => {
    const funding = FundingSchema.parse({
      id: "fund",
      version: 1,
      source: "usg",
      purpose: "Fictional meeting",
      amount: 200,
    });
    const event = item([task("registry", { sourceNodeId: "registry" })], {
      venue: "offcampus",
      funding: [funding],
    });
    expect(registrationRequired(event)).toBe(true);
    const schedule = scheduleWorkItem(event, members);
    expect(schedule.tasks.registry.official).toBe("2026-10-20");
    expect(
      schedule.issues.some((x) => x.includes("registration_missing")),
    ).toBe(false);
    expect(registrationRequired({ ...event, funding: [] })).toBe(false);
    expect(registrationRequired({ ...event, kind: "executive_work" })).toBe(
      false,
    );
    expect(
      registrationRequired({ ...event, venue: "campus", funding: [] }),
    ).toBe(true);
  });
  it("reports a missing required registration task rather than assigning its deadline to another task", () => {
    const schedule = scheduleWorkItem(
      item([task("other")], { venue: "campus" }),
      members,
    );
    expect(schedule.issues.join(" ")).toContain("registration_missing");
    expect(schedule.tasks.other.official).toBeNull();
  });
});

describe("calendar coverage and personal work", () => {
  it("rolls non-working-day targets earlier with an explanation", () => {
    const holiday = scheduleWorkItem(
      item([task("one", { relativeTarget: relative(8) })]),
      members,
    );
    expect(holiday.tasks.one.due).toBe("2026-11-10"); // raw target is Veterans Day.
    expect(holiday.tasks.one.basis).toContain(
      "2026-11-11 adjusted to 2026-11-10",
    );
    const weekend = scheduleWorkItem(
      item([task("one", { relativeTarget: relative(4) })]),
      members,
    );
    expect(weekend.tasks.one.due).toBe("2026-11-13");
  });
  it("counts business offsets over Thanksgiving", () => {
    const schedule = scheduleWorkItem(
      item([task("one", { relativeTarget: relative(5, "business") })], {
        date: "2026-12-03",
      }),
      members,
    );
    expect(schedule.tasks.one.due).toBe("2026-11-24");
  });
  it("keeps personal effort out of busy weeks and respects personal buffers", () => {
    const original = item([task("one", { relativeTarget: relative(14) })]);
    const normal = scheduleWorkItem(original, members);
    const busy = scheduleWorkItem(original, [
      { ...members[0], busyWeeks: ["2026-11-02"] },
    ]);
    expect(normal.tasks.one.start).toBe("2026-11-03");
    expect(busy.tasks.one.start).toBe("2026-10-29");
    const buffered = scheduleWorkItem(original, [
      { ...members[0], bufferDays: 3 },
    ]);
    expect(buffered.tasks.one.start! < normal.tasks.one.start!).toBe(true);
  });
  it("skips finals and the known winter semester gap without inventing future academic terms", () => {
    const schedule = scheduleWorkItem(
      item([task("one", { relativeTarget: relative(42) })], {
        date: "2027-02-11",
      }),
      members,
    );
    expect(schedule.tasks.one.due).toBe("2026-12-31");
    expect(schedule.tasks.one.start).toBe("2026-12-03");
    expect(schedule.tasks.one.basis).toContain("finals, semester gaps");
  });
  it("does not mistake spring break for an ASU office closure", () => {
    const schedule = scheduleWorkItem(
      item([task("one", { relativeTarget: relative(14) })], {
        date: "2027-03-23",
      }),
      members,
    );
    expect(schedule.tasks.one.due).toBe("2027-03-09");
    expect(schedule.tasks.one.start).toBe("2027-03-05");
  });
  it("returns null predictions and a clear error for unsupported event dates", () => {
    const schedule = scheduleWorkItem(
      item([task("one", { relativeTarget: relative(42) })], {
        date: "2028-10-10",
      }),
      members,
    );
    expect(schedule.covered).toBe(false);
    expect(schedule.tasks.one.start).toBeNull();
    expect(schedule.tasks.one.due).toBeNull();
    expect(schedule.tasks.one.official).toBeNull();
    expect(schedule.issues.join(" ")).toContain("calendar_uncovered");
    expect(schedule.issues.join(" ")).toContain(SCHEDULE_CALENDAR.to);
  });
  it("rejects offsets outside calendar coverage instead of returning a guarded but invalid date", () => {
    const schedule = scheduleWorkItem(
      item([task("one", { relativeTarget: relative(300) })]),
      members,
    );
    expect(schedule.covered).toBe(false);
    expect(schedule.tasks.one.due).toBeNull();
  });
  it("keeps undated work undated rather than defaulting to today", () => {
    const schedule = scheduleWorkItem(
      item([task("one", { relativeTarget: relative(42) }), task("two")], {
        date: null,
      }),
      members,
      "2026-10-26",
    );
    expect(
      Object.values(schedule.tasks).every(
        (t) => t.start === null && t.due === null,
      ),
    ).toBe(true);
    expect(schedule.issues.join(" ")).toContain("event_date_missing");
  });
  it("rejects impossible date-only values instead of normalizing them into another month", () => {
    const schedule = scheduleWorkItem(
      item([task("one")], { date: "2026-02-30" }),
      members,
    );
    expect(schedule.covered).toBe(false);
    expect(schedule.tasks.one.due).toBeNull();
    expect(schedule.issues.join(" ")).toContain("invalid_event_date");
  });
  it("flags too-short preparation windows instead of pushing targets into the future", () => {
    const schedule = scheduleWorkItem(
      item([task("one", { relativeTarget: relative(56) })]),
      members,
      "2026-11-01",
    );
    expect(schedule.tasks.one.due).toBe("2026-09-24");
    expect(schedule.tasks.one.issues.join(" ")).toContain("preparation_window");
    expect(schedule.tasks.one.issues.join(" ")).toContain("overdue");
  });
  it("reports R13 finals events and retains the selected date", () => {
    const event = item([task("one")], { date: "2026-12-09" });
    expect(scheduleWorkItem(event, members).issues.join(" ")).toContain(
      "finals: ASU R13",
    );
    expect(event.date).toBe("2026-12-09");
  });
});

describe("dependencies, absolute overrides and history", () => {
  it("projects UTC completion timestamps to Phoenix days before dependency arithmetic", () => {
    const event = item([
      task("done", { status: "done", completedAt: "2026-11-02T02:00:00Z" }),
      task("next", { dependsOn: ["done"], dueOverride: "2026-11-04" }),
    ]);
    const schedule = scheduleWorkItem(event, members);
    expect(schedule.tasks.done.due).toBe("2026-11-01");
    expect(schedule.tasks.next.start).toBe("2026-11-02");
    expect(schedule.tasks.next.issues.join(" ")).not.toContain(
      "fixed_date_dependency_conflict",
    );
  });
  it("retains date-only completion records and does not require calendar prediction in old history", () => {
    const schedule = scheduleWorkItem(
      item([
        task("done", { status: "done", completedAt: "2020-10-01" }),
        task("next", { dependsOn: ["done"], relativeTarget: relative(20) }),
      ]),
      members,
    );
    expect(schedule.tasks.done.due).toBe("2020-10-01");
    expect(schedule.tasks.next.due).toBe("2026-10-30");
    expect(schedule.covered).toBe(true);
  });
  it("does not treat a done timestamp as approval when the separate gate is pending", () => {
    const event = item(
      [
        task("approval", {
          kind: "approval",
          gateId: "gate",
          status: "done",
          completedAt: "2026-10-01T12:00:00Z",
        }),
        task("purchase", {
          dependsOn: ["approval"],
          relativeTarget: relative(20),
        }),
      ],
      {
        gates: [
          GateSchema.parse({
            id: "gate",
            taskId: "approval",
            kind: "budget",
            status: "pending",
          }),
        ],
      },
    );
    const pending = scheduleWorkItem(event, members);
    expect(pending.tasks.approval.due).not.toBe("2026-10-01");
    expect(pending.tasks.approval.issues.join(" ")).toContain(
      "approval_not_confirmed",
    );
    const approved = scheduleWorkItem(
      {
        ...event,
        gates: event.gates.map((gate) => ({ ...gate, status: "approved" })),
      },
      members,
    );
    expect(approved.tasks.approval.due).toBe("2026-10-01");
  });
  it("uses executive dates as completion targets and does not prohibit administrative work in finals", () => {
    const executive = scheduleWorkItem(
      item([task("one")], { kind: "executive_work", date: "2026-12-09" }),
      members,
    );
    expect(executive.tasks.one.due).toBe("2026-12-09");
    expect(executive.issues.join(" ")).not.toContain("finals: ASU R13");
    expect(executive.tasks.one.basis).toContain(
      "selected work completion date",
    );
  });
  it("all waits for the latest prerequisite; any can use the earliest and does not cancel other branches", () => {
    const tasks = [
      task("early", { dueOverride: "2026-10-20" }),
      task("late", { dueOverride: "2026-11-05" }),
      task("join", {
        dependsOn: ["early", "late"],
        relativeTarget: relative(20),
        dependencyMode: "all",
      }),
    ];
    const all = scheduleWorkItem(item(tasks), members);
    const any = scheduleWorkItem(
      item(
        tasks.map((t) =>
          t.id === "join" ? { ...t, dependencyMode: "any" } : t,
        ),
      ),
      members,
    );
    expect(all.tasks.join.start).toBe("2026-11-06");
    expect(all.tasks.join.due).toBe("2026-11-10");
    expect(any.tasks.join.due).toBe("2026-10-30");
    expect(any.tasks.late.due).toBe("2026-11-05");
    expect(any.tasks.join.basis).toContain("other branches remain active");
  });
  it("does not make independent branches wait for a stuck task", () => {
    const event = item([
      task("stuck", { status: "stuck", dueOverride: "2026-11-05" }),
      task("dependent", { dependsOn: ["stuck"], relativeTarget: relative(20) }),
      task("independent", { relativeTarget: relative(20) }),
    ]);
    const schedule = scheduleWorkItem(event, members);
    expect(
      schedule.tasks.dependent.due! > schedule.tasks.independent.due!,
    ).toBe(true);
    expect(event.tasks[0].status).toBe("stuck");
  });
  it("keeps explicit dates fixed even when dependencies conflict or the activity is rescheduled", () => {
    const event = item([
      task("upstream", { dueOverride: "2026-11-05" }),
      task("fixed", { dependsOn: ["upstream"], dueOverride: "2026-10-30" }),
    ]);
    const schedule = scheduleWorkItem(event, members);
    expect(schedule.tasks.fixed.due).toBe("2026-10-30");
    expect(schedule.tasks.fixed.issues.join(" ")).toContain(
      "fixed_date_dependency_conflict",
    );
    expect(
      scheduleWorkItem({ ...event, date: "2026-12-03" }, members).tasks.fixed
        .due,
    ).toBe("2026-10-30");
  });
  it("keeps recorded completion history and absolute funding dates while relative work moves", () => {
    const funding = FundingSchema.parse({
      id: "fund",
      version: 1,
      source: "dues",
      purpose: "Fictional event",
      amount: 200,
      spendBy: "2026-12-19",
    });
    const original = item(
      [
        task("done", { status: "done", completedAt: "2026-10-01T12:00:00Z" }),
        task("future", { relativeTarget: relative(42) }),
      ],
      { funding: [funding] },
    );
    const copy = structuredClone(original);
    const before = scheduleWorkItem(original, members);
    const after = scheduleWorkItem(
      { ...original, date: "2026-12-03" },
      members,
    );
    expect(after.tasks.done.due).toBe("2026-10-01");
    expect(after.tasks.done.start).toBe("2026-10-01");
    expect(after.tasks.future.due).not.toBe(before.tasks.future.due);
    expect(original).toEqual(copy);
    expect(original.funding[0].spendBy).toBe("2026-12-19");
  });
  it("protects manual overrides across template timing updates", () => {
    const event = item([
      task("one", { dueOverride: "2026-10-30", relativeTarget: relative(42) }),
    ]);
    const updated = {
      ...event,
      templateVersion: 4,
      timingDefaults: { itemsWeeks: 3, quotesWeeks: 2, budgetWeeks: 1 },
      tasks: event.tasks.map((t) => ({ ...t, relativeTarget: relative(7) })),
    };
    expect(scheduleWorkItem(event, members).tasks.one.due).toBe("2026-10-30");
    expect(scheduleWorkItem(updated, members).tasks.one.due).toBe("2026-10-30");
  });
  it("reports loops and missing references without assigning plausible substitute dates", () => {
    const schedule = scheduleWorkItem(
      item([
        task("a", { dependsOn: ["b"] }),
        task("b", { dependsOn: ["a"] }),
        task("orphan", { dependsOn: ["missing"] }),
      ]),
      members,
    );
    expect(schedule.tasks.a.due).toBeNull();
    expect(schedule.tasks.b.due).toBeNull();
    expect(schedule.tasks.orphan.due).toBeNull();
    expect(schedule.issues.join(" ")).toContain("dependency_cycle");
    expect(schedule.tasks.orphan.issues.join(" ")).toContain(
      "dependency_missing",
    );
  });
  it("excludes only explicitly inactive branches and keeps optional work visible", () => {
    const schedule = scheduleWorkItem(
      item([
        task("inactive", { applicability: "inactive" }),
        task("optional", {
          applicability: "optional",
          relativeTarget: relative(7),
        }),
        task("required", {
          dependsOn: ["inactive"],
          relativeTarget: relative(14),
        }),
      ]),
      members,
    );
    expect(schedule.tasks.inactive.due).toBeNull();
    expect(schedule.tasks.optional.due).not.toBeNull();
    expect(schedule.tasks.required.due).toBe("2026-11-05");
  });
  it("is deterministic when the task array is reordered and does not mutate the input", () => {
    const original = item([
      task("one", { relativeTarget: relative(42) }),
      task("two", { dependsOn: ["one"] }),
    ]);
    const copy = structuredClone(original);
    const first = scheduleWorkItem(original, members);
    const reordered = scheduleWorkItem(
      { ...original, tasks: original.tasks.slice().reverse() },
      members,
    );
    expect(reordered.tasks).toEqual(first.tasks);
    expect(original).toEqual(copy);
  });
});
