import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { computeSchedule } from "../engine/schedule"
import { asuSentence, dueOf, isLate, OTHERS_REMINDER, reminderSentence, workingDaysBetween } from "../lib/taskDue"
import { buildNudge, nudgeCheck } from "../lib/nudges"
import { fmtShort } from "../lib/dates"
import type { Node } from "../data/types"

// Dates are read from the engine's own output, never written here, because FB-6 re-times the event template.
const s = seedDemo()
const sched = computeSchedule(s)
const ruled = s.nodes.filter(n => n.eventId && n.anchor?.kind === "rule" && sched.nodes[n.id]?.official)

describe("FB-4 one Due: the ASU sentence in Why this date", () => {
  it("the demo has rule steps to check", () => expect(ruled.length).toBeGreaterThan(0))

  it("every step with an ASU rule says when ASU needs it and how many working days earlier the club finishes", () => {
    for (const n of ruled) {
      const p = sched.nodes[n.id]
      const text = asuSentence(n, p)!
      expect(text, n.id).toContain(`ASU needs this by ${fmtShort(p.official!)}.`)
      if (p.club < p.official!) {
        const gap = workingDaysBetween(p.club, p.official!)
        expect(text, n.id).toContain(`Your club finishes ${gap} working day${gap === 1 ? "" : "s"} earlier.`)
      }
    }
  })

  it("steps without an ASU rule get no sentence, and a hand-made task's own due date is not called ASU", () => {
    for (const n of s.nodes.filter(n => !sched.nodes[n.id]?.official)) expect(asuSentence(n, sched.nodes[n.id]), n.id).toBeNull()
    const handMade = { eventId: null, anchor: { kind: "fixed", official: "2026-11-06", club: "2026-11-03" } } as Pick<Node, "eventId" | "anchor">
    expect(asuSentence(handMade, { official: "2026-11-06", club: "2026-11-03" })).toBeNull()
  })

  it("counts ASU working days, skipping weekends, and words the edge cases plainly", () => {
    const rule = { eventId: "e", anchor: { kind: "rule", ruleId: "R09", days: 14 } } as Pick<Node, "eventId" | "anchor">
    // 2026-11-13 is a Friday and 2026-11-18 the next Wednesday: Mon, Tue, Wed are three working days.
    expect(workingDaysBetween("2026-11-13", "2026-11-18")).toBe(3)
    expect(asuSentence(rule, { official: "2026-11-18", club: "2026-11-13" })).toBe("ASU needs this by Nov 18. Your club finishes 3 working days earlier.")
    expect(asuSentence(rule, { official: "2026-11-18", club: "2026-11-17" })).toBe("ASU needs this by Nov 18. Your club finishes 1 working day earlier.")
    expect(asuSentence(rule, { official: "2026-11-18", club: "2026-11-18" })).toBe("ASU needs this by Nov 18. Your club finishes the same day.")
    expect(asuSentence(rule, { official: "2026-11-18", club: "2026-11-20" })).toBe("ASU needs this by Nov 18. Your club's Due is after it.")
  })
})

describe("FB-4 one Due: the reminder line and the Due itself", () => {
  const n = s.nodes.find(x => x.ownerId && sched.nodes[x.id]?.latestStart && x.status !== "done")!
  const p = sched.nodes[n.id]

  it("the owner sees when the reminder goes out; anyone else sees the general rule, without the date", () => {
    expect(reminderSentence(n, p, n.ownerId!)).toBe(`Reminder goes out ${fmtShort(p.latestStart)}.`)
    const other = s.people.find(x => x.id !== n.ownerId)!.id
    expect(reminderSentence(n, p, other)).toBe(OTHERS_REMINDER)
    expect(OTHERS_REMINDER).not.toContain(fmtShort(p.latestStart))
  })

  it("Due is the engine's club deadline, and it is late only while the task is open", () => {
    expect(dueOf(n, p)).toBe(p.club)
    expect(dueOf({ clubDeadline: "2026-11-01" }, null)).toBe("2026-11-01")
    expect(isLate({ status: "accepted" }, "2026-10-21", "2026-10-22")).toBe(true)
    expect(isLate({ status: "done" }, "2026-10-21", "2026-10-22")).toBe(false)
    expect(isLate({ status: "accepted" }, "2026-10-22", "2026-10-22")).toBe(false)
  })
})

describe("FB-4 reminder message: one Due, five checked parts", () => {
  it("every seeded task's When line says Due and Best started by, never ASU, and still passes the check", () => {
    for (const node of s.nodes) {
      const d = buildNudge(s, node)
      const when = d.body.split("\n").find(l => l.startsWith("• When:"))!
      expect(nudgeCheck(d.subject, d.body).ok, node.id).toBe(true)
      expect(when, node.id).not.toMatch(/ASU|club deadline|start by/)
      if (node.clubDeadline) expect(when, node.id).toContain(`Due ${fmtShort(node.clubDeadline)}.`)
      if (node.latestStart) expect(when, node.id).toContain(`Best started by ${fmtShort(node.latestStart)}.`)
      // The subject line is unchanged: title · effort · due date.
      expect(d.subject, node.id).toMatch(/ · ~\d+ workdays? · due /)
    }
  })
})
