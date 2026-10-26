import type {
  RelativeTarget,
  TimingDefaults,
  WorkItem,
  WorkSchedule,
  WorkTask,
  WorkspaceMember,
} from "./contracts";
import { DEFAULT_TIMING } from "./contracts/timing";
import {
  BREAKS,
  CALENDAR_CHECKED_ON,
  FINALS,
  HOLIDAYS,
  TERMS,
} from "../engine/calendar";
import { RULES } from "../data/rules";

/** Dates are day-only values. Neither the host timezone nor a model may choose them. */
const DAY = 86_400_000;
export const SCHOOL_BUFFER_DAYS = 3;
export const DEFAULT_MEMBER_BUFFER_DAYS = 1;
export const SCHEDULE_CALENDAR = {
  from: TERMS.map((p) => p.from).sort()[0],
  to: TERMS.map((p) => p.to)
    .sort()
    .at(-1)!,
  checkedOn: CALENDAR_CHECKED_ON,
} as const;
const RULE_TIMING: Record<
  string,
  { days: number; unit: "calendar" | "business" }
> = {
  R01: { days: 30, unit: "calendar" },
  R03: { days: 16, unit: "calendar" },
  R04: { days: 14, unit: "calendar" },
  R05: { days: 14, unit: "calendar" },
  R06: { days: 14, unit: "calendar" },
  R07: { days: 7, unit: "business" },
  R09: { days: 10, unit: "business" },
  R10: { days: 14, unit: "business" },
};
const registrationKeys = new Set([
  "registry",
  "event_registry",
  "register_event",
]);
const validDate = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value + "T00:00:00Z")) &&
  new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
const add = (date: string, days: number) =>
  new Date(Date.parse(date + "T00:00:00Z") + days * DAY)
    .toISOString()
    .slice(0, 10);
const businessDay = (date: string) =>
  ![0, 6].includes(new Date(date + "T00:00:00Z").getUTCDay()) &&
  !(date in HOLIDAYS);
const during = (date: string, periods: { from: string; to: string }[]) =>
  periods.some((p) => date >= p.from && date <= p.to);
const min = (dates: string[]) => dates.slice().sort()[0];
const max = (dates: string[]) => dates.slice().sort().at(-1)!;
const recordedDate = (task: WorkTask) =>
  validDate(task.completedAt?.slice(0, 10))
    ? task.completedAt!.slice(0, 10)
    : null;

/** R01 covers school-funded off-campus events as well as in-person campus events. */
export function registrationRequired(
  item: Pick<WorkItem, "kind" | "venue" | "funding">,
): boolean {
  return (
    item.kind === "member_event" &&
    (item.venue === "campus" ||
      item.funding.some((f) => f.source === "usg" || f.source === "college"))
  );
}

/** Milestones are organization preferences, never purported ASU deadlines. */
export function milestoneTarget(
  key: string,
  timing: TimingDefaults = DEFAULT_TIMING,
): RelativeTarget | null {
  const weeks = ["confirm_items", "items"].includes(key)
    ? timing.itemsWeeks
    : ["confirm_quotes", "quotes"].includes(key)
      ? timing.quotesWeeks
      : ["submit_budget_request", "budget_request"].includes(key)
        ? timing.budgetWeeks
        : null;
  return weeks === null
    ? null
    : {
        offsetDays: weeks * 7,
        unit: "calendar",
        source: "organization-default",
      };
}

class CalendarError extends Error {}
function covered(date: string) {
  if (
    !validDate(date) ||
    date < SCHEDULE_CALENDAR.from ||
    date > SCHEDULE_CALENDAR.to
  )
    throw new CalendarError(
      `No verified student calendar covers ${date}. Supported range: ${SCHEDULE_CALENDAR.from} to ${SCHEDULE_CALENDAR.to}.`,
    );
}
function roll(date: string, direction: -1 | 1, work = businessDay): string {
  let result = date;
  for (let steps = 0; steps <= 800; steps++) {
    covered(result);
    if (work(result)) return result;
    result = add(result, direction);
  }
  throw new CalendarError(
    "The available calendar cannot produce a reliable working date.",
  );
}
function shift(date: string, days: number, work = businessDay): string {
  covered(date);
  let result = date;
  const direction = days < 0 ? -1 : 1;
  for (let remaining = Math.ceil(Math.abs(days)); remaining > 0; remaining--)
    result = roll(add(result, direction), direction, work);
  return result;
}
function memberCalendar(member?: WorkspaceMember) {
  const busy = new Set(
    (member?.busyWeeks ?? [])
      .filter(validDate)
      .flatMap((date) => Array.from({ length: 7 }, (_, i) => add(date, i))),
  );
  return (date: string) =>
    businessDay(date) &&
    during(date, TERMS) &&
    !during(date, FINALS) &&
    !busy.has(date);
}
function taskRules(item: WorkItem, task: WorkTask, issues: string[]) {
  const requested = task.officialRules.slice();
  if (
    registrationRequired(item) &&
    registrationKeys.has(task.sourceNodeId ?? "") &&
    !requested.some((r) => r.ruleId === "R01")
  )
    requested.push({ ruleId: "R01", ...RULE_TIMING.R01 });
  const unique = new Map<
    string,
    { ruleId: string; days: number; unit: "calendar" | "business" }
  >();
  for (const rule of requested) {
    const canonical = RULE_TIMING[rule.ruleId];
    if (!canonical) {
      issues.push(
        `unsupported_official_rule: No verified date formula exists for ${rule.ruleId}; it was not converted into an invented deadline.`,
      );
      continue;
    }
    if (rule.days !== canonical.days || rule.unit !== canonical.unit)
      issues.push(
        `official_rule_protected: ${rule.ruleId} uses ${canonical.days} ${canonical.unit} days. The conflicting proposed rule value was ignored.`,
      );
    unique.set(rule.ruleId, { ruleId: rule.ruleId, ...canonical });
  }
  return [...unique.values()];
}

interface Recommendation {
  due: string | null;
  start: string | null;
  official: string | null;
  basis: string[];
  issues: string[];
}

/** Pure, non-mutating schedule projection shared by timeline, Board and server validation. */
export function scheduleWorkItem(
  item: WorkItem,
  members: WorkspaceMember[],
  today?: string,
): WorkSchedule {
  const result: WorkSchedule = { tasks: {}, issues: [], covered: true };
  const active = item.tasks.filter((t) => t.applicability !== "inactive");
  const byId = new Map(item.tasks.map((t) => [t.id, t]));
  const activeIds = new Set(active.map((t) => t.id));
  const memberById = new Map(members.map((m) => [m.id, m]));
  const work = (task: WorkTask) =>
    memberCalendar(memberById.get(task.ownerId ?? ""));
  const duration = (task: WorkTask) =>
    Math.ceil(
      Math.max(0, task.estimatedDays) +
        Math.max(
          0,
          memberById.get(task.ownerId ?? "")?.bufferDays ??
            DEFAULT_MEMBER_BUFFER_DAYS,
        ),
    );
  const rec = new Map<string, Recommendation>();
  const reportCalendar = (error: unknown, issues: string[]) => {
    if (error instanceof CalendarError) {
      result.covered = false;
      issues.push(`calendar_uncovered: ${error.message}`);
    } else issues.push(`invalid_schedule: ${(error as Error).message}`);
  };
  let eventDate: string | null = item.date;
  if (eventDate && !validDate(eventDate)) {
    result.issues.push("invalid_event_date: Enter a real YYYY-MM-DD date.");
    eventDate = null;
    result.covered = false;
  }
  let eventCovered = true;
  if (eventDate) {
    try {
      covered(eventDate);
    } catch (e) {
      eventCovered = false;
      reportCalendar(e, result.issues);
    }
    if (item.kind === "member_event" && during(eventDate, FINALS))
      result.issues.push(
        "finals: ASU R13 prohibits events during final exams.",
      );
    if (eventDate in HOLIDAYS)
      result.issues.push(
        `holiday: ASU is closed on ${eventDate} (${HOLIDAYS[eventDate]}).`,
      );
    if (during(eventDate, BREAKS))
      result.issues.push(
        "academic_break: Classes are excused; some members may be away. ASU business-day deadlines still apply.",
      );
    if (eventCovered && !during(eventDate, TERMS))
      result.issues.push(
        "between_terms: This date is between semesters; student availability may be limited.",
      );
  } else
    result.issues.push(
      "event_date_missing: Choose a date to calculate relative activity targets. Undated work is kept without invented dates.",
    );
  if (today && !validDate(today))
    result.issues.push(
      "invalid_today: The reference date was ignored because it is not a real YYYY-MM-DD date.",
    );
  const reference = validDate(today) ? today : null;
  if (
    registrationRequired(item) &&
    !active.some(
      (t) =>
        t.officialRules.some((r) => r.ruleId === "R01") ||
        registrationKeys.has(t.sourceNodeId ?? ""),
    )
  ) {
    result.issues.push(
      "registration_missing: ASU R01 requires an Event Registry step for this campus or school-funded off-campus event. Add the dated registration task; another task was not silently substituted.",
    );
  }
  for (const task of item.tasks) {
    const issues: string[] = [];
    const basis: string[] = [];
    if (task.applicability === "inactive") {
      rec.set(task.id, {
        due: null,
        start: null,
        official: null,
        basis: ["Explicitly inactive branch; no predicted dates."],
        issues,
      });
      continue;
    }
    if (task.status === "done") {
      const date = recordedDate(task);
      if (!date)
        issues.push(
          "completion_date_missing: This completed task has no valid recorded completion date; its historical date was not invented.",
        );
      rec.set(task.id, {
        due: date,
        start: date,
        official: null,
        basis: [
          "Recorded completion history; event changes do not reschedule completed work.",
        ],
        issues,
      });
      continue;
    }
    for (const id of task.dependsOn)
      if (!byId.has(id))
        issues.push(
          `dependency_missing: The prerequisite ${id} does not exist in this work item.`,
        );
    if (task.parentWorkItemId !== item.id)
      issues.push("wrong_parent: This task belongs to a different work item.");
    if (!Number.isFinite(task.estimatedDays) || task.estimatedDays < 0)
      issues.push(
        "invalid_effort: Estimated effort must be a non-negative number.",
      );
    if (task.dueOverride && !validDate(task.dueOverride))
      issues.push(
        "invalid_override: The explicit fixed date is invalid; it was not replaced silently.",
      );
    let due: string | null = null,
      official: string | null = null;
    try {
      if (!eventCovered)
        throw new CalendarError(
          `No reliable schedule is available for event date ${eventDate}.`,
        );
      const candidates: string[] = [];
      if (task.relativeTarget) {
        if (eventDate) {
          const { offsetDays, unit, source } = task.relativeTarget;
          if (!Number.isInteger(offsetDays) || !Number.isFinite(offsetDays))
            throw new Error("Relative offset must be an integer.");
          const raw =
            unit === "business"
              ? shift(eventDate, -offsetDays)
              : add(eventDate, -offsetDays);
          const target = roll(raw, offsetDays < 0 ? 1 : -1);
          candidates.push(target);
          basis.push(
            `${source} target: ${offsetDays} ${unit} days before the event${raw !== target ? `; ${raw} adjusted to ${target} for a non-business day` : ""}; template version ${item.templateVersion}.`,
          );
        } else
          issues.push(
            "relative_target_undated: Relative target is preserved until the work item has a date.",
          );
      }
      const rules = taskRules(item, task, issues);
      if (eventDate)
        for (const rule of rules) {
          const deadline =
            rule.unit === "business"
              ? shift(eventDate, -rule.days)
              : roll(add(eventDate, -rule.days), -1);
          official = min([deadline, ...(official ? [official] : [])]);
          candidates.push(shift(deadline, -SCHOOL_BUFFER_DAYS));
          basis.push(
            `ASU ${rule.ruleId}: ${rule.days} ${rule.unit} days before event; ${SCHOOL_BUFFER_DAYS} school-business-day internal buffer. Source checked ${RULES.find((r) => r.id === rule.ruleId)?.checkedOn ?? "unknown"}.`,
          );
        }
      if (rules.length && !eventDate)
        issues.push(
          "official_deadline_undated: Official rule is retained, but an event date is needed to calculate its deadline.",
        );
      if (candidates.length) due = min(candidates);
      if (task.dueOverride) covered(task.dueOverride);
    } catch (e) {
      reportCalendar(e, issues);
      due = null;
      official = null;
    }
    rec.set(task.id, { due, start: null, official, basis, issues });
  }

  const indegree = new Map(active.map((t) => [t.id, 0]));
  const children = new Map(active.map((t) => [t.id, [] as string[]]));
  for (const task of active)
    for (const id of new Set(task.dependsOn))
      if (activeIds.has(id)) {
        indegree.set(task.id, indegree.get(task.id)! + 1);
        children.get(id)!.push(task.id);
      }
  const queue = active
    .filter((t) => indegree.get(t.id) === 0)
    .map((t) => t.id)
    .sort();
  const ordered: WorkTask[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    ordered.push(byId.get(id)!);
    for (const child of children.get(id)!) {
      indegree.set(child, indegree.get(child)! - 1);
      if (indegree.get(child) === 0) {
        queue.push(child);
        queue.sort();
      }
    }
  }
  const cyclic = new Set(
    active.filter((t) => !ordered.some((o) => o.id === t.id)).map((t) => t.id),
  );
  if (cyclic.size)
    result.issues.push(
      "dependency_cycle: A dependency cycle prevents a reliable schedule for the affected tasks.",
    );
  const anyChoice = new Map<string, string>();
  for (const task of active)
    if (task.dependencyMode === "any") {
      const parents = task.dependsOn
        .filter((id) => activeIds.has(id))
        .map((id) => byId.get(id)!);
      const dated = parents.filter(
        (p) => p.status === "done" && recordedDate(p),
      );
      const candidates = dated.length ? dated : parents;
      candidates.sort(
        (a, b) =>
          (
            a.dueOverride ??
            rec.get(a.id)?.due ??
            eventDate ??
            "9999"
          ).localeCompare(
            b.dueOverride ?? rec.get(b.id)?.due ?? eventDate ?? "9999",
          ) || a.id.localeCompare(b.id),
      );
      if (candidates[0]) anyChoice.set(task.id, candidates[0].id);
    }
  // Backward pass: all parents constrain a join; one suitable alternative is enough for any.
  for (const task of ordered.slice().reverse()) {
    const plan = rec.get(task.id)!;
    if (
      task.status === "done" ||
      plan.issues.some((i) =>
        /^(calendar_uncovered|invalid_|dependency_missing|wrong_parent)/.test(
          i,
        ),
      )
    )
      continue;
    try {
      const candidates = plan.due ? [plan.due] : [];
      for (const childId of children.get(task.id)!) {
        const child = byId.get(childId)!;
        if (
          child.status === "done" ||
          (child.dependencyMode === "any" && anyChoice.get(childId) !== task.id)
        )
          continue;
        const start = rec.get(childId)?.start;
        if (start) candidates.push(shift(start, -1));
      }
      if (!candidates.length && eventDate) {
        plan.basis.push(
          item.kind === "executive_work"
            ? "Organization fallback: the selected work completion date."
            : "Organization fallback: the business day before the event; this is not an ASU rule.",
        );
        candidates.push(
          roll(
            item.kind === "executive_work" ? eventDate : add(eventDate, -1),
            -1,
          ),
        );
      }
      if (candidates.length) plan.due = min(candidates);
      const due = task.dueOverride ?? plan.due;
      if (due)
        plan.start = duration(task)
          ? shift(due, -duration(task), work(task))
          : roll(due, -1, work(task));
      plan.basis.push(
        `${Math.ceil(Math.max(0, task.estimatedDays))} estimated work days plus ${memberById.get(task.ownerId ?? "")?.bufferDays ?? DEFAULT_MEMBER_BUFFER_DAYS} personal buffer days; skips school closures, finals, semester gaps and assigned busy weeks.`,
      );
    } catch (e) {
      reportCalendar(e, plan.issues);
      plan.due = null;
      plan.start = null;
      plan.official = null;
    }
  }
  for (const task of item.tasks) {
    const plan = rec.get(task.id)!;
    if (task.applicability === "inactive" || task.status === "done") {
      result.tasks[task.id] = {
        start: plan.start,
        due: plan.due,
        official: plan.official,
        issues: plan.issues,
        basis: plan.basis.join(" "),
      };
      continue;
    }
    if (cyclic.has(task.id))
      plan.issues.push(
        "dependency_cycle: This task is in or depends on a cycle.",
      );
    // A separate topological forward pass below handles normal tasks, independent of input array order.
  }
  for (const task of ordered) {
    if (task.status === "done") continue;
    const plan = rec.get(task.id)!;
    let due =
      task.dueOverride &&
      !plan.issues.some((i) => /^(calendar_uncovered|invalid_override)/.test(i))
        ? task.dueOverride
        : plan.due;
    let start = plan.start;
    const parents = task.dependsOn
      .filter((id) => activeIds.has(id))
      .map((id) => ({ task: byId.get(id)!, schedule: result.tasks[id] }));
    const completions = parents
      .map((p) =>
        p.task.status === "done" ? recordedDate(p.task) : p.schedule?.due,
      )
      .filter((date): date is string => !!date);
    const unresolved =
      task.dependencyMode === "all"
        ? completions.length !== parents.length
        : parents.length > 0 && completions.length === 0;
    if (
      unresolved ||
      plan.issues.some((i) =>
        /^(dependency_missing|wrong_parent|invalid_)/.test(i),
      )
    ) {
      plan.issues.push(
        "dependency_unplanned: A required prerequisite has no reliable completion date.",
      );
      if (!task.dueOverride) {
        start = null;
        due = null;
      }
    } else if (completions.length && start) {
      try {
        const readyBoundary = add(
          task.dependencyMode === "any" ? min(completions) : max(completions),
          1,
        );
        const ready =
          readyBoundary <= start ? start : roll(readyBoundary, 1, work(task));
        if (ready > start) {
          if (task.dueOverride)
            plan.issues.push(
              `fixed_date_dependency_conflict: This fixed date was preserved, but prerequisites cannot finish before its planned start ${start}.`,
            );
          else {
            start = ready;
            due = shift(start, duration(task), work(task));
            plan.issues.push(
              `dependency_shift: Prerequisites move this estimate later than the recommended target ${plan.due ?? "undated"}.`,
            );
          }
        }
        plan.basis.push(
          task.dependencyMode === "any"
            ? "Any: earliest available prerequisite; other branches remain active."
            : "All: latest required prerequisite completion.",
        );
      } catch (e) {
        reportCalendar(e, plan.issues);
        start = null;
        due = null;
      }
    }
    if (due && plan.official && due > plan.official)
      plan.issues.push(
        `official_missed: Planned finish ${due} is after the unchanged official deadline ${plan.official}.`,
      );
    if (
      eventDate &&
      due &&
      task.relativeTarget?.offsetDays !== undefined &&
      task.relativeTarget.offsetDays >= 0 &&
      due >= eventDate
    )
      plan.issues.push(
        "after_event: Planned preparation finishes on or after the event.",
      );
    if (reference && start && start < reference)
      plan.issues.push(
        `preparation_window: Work should have started by ${start}; the remaining preparation window is shorter than this plan requires.`,
      );
    if (reference && due && due < reference)
      plan.issues.push(`overdue: The internal target ${due} has passed.`);
    if (task.dueOverride)
      plan.basis.push(
        `Explicit fixed date ${task.dueOverride} is protected from event-date or template changes.`,
      );
    result.tasks[task.id] = {
      start,
      due,
      official: plan.official,
      issues: plan.issues,
      basis: plan.basis.join(" "),
    };
  }
  for (const task of item.tasks) {
    if (!result.tasks[task.id]) {
      const plan = rec.get(task.id)!;
      result.tasks[task.id] = {
        start: null,
        due: null,
        official: plan.official,
        issues: plan.issues,
        basis: plan.basis.join(" "),
      };
    }
    for (const message of result.tasks[task.id].issues)
      result.issues.push(`${task.title}: ${message}`);
  }
  return result;
}
