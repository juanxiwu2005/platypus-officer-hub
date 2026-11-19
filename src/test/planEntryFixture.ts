import { seedDemo } from "../data/seed"
import { applySchedule } from "../engine/schedule"
import { createReminderRuntime } from "../reminders/engine"
import type { DemoState, Node } from "../data/types"

export const PLAN_ROOM = "plan-room", PLAN_OTHER = "plan-requirements", PLAN_EVENT = "plan-speaker"
export function planEntryFixture(viewerId = "alex"): DemoState {
  const base = seedDemo(undefined, "v2"), source = base.nodes.find(node => node.stepKey === "venue")!
  const event = { ...base.events.find(item => item.id === source.eventId)!, id: PLAN_EVENT, name: "Speaker Night", date: "2027-04-16", headcount: 40, budgetItems: [] }
  const room: Node = { ...source, id: PLAN_ROOM, eventId: event.id, title: "Reserve a room", instructions: "Book an accessible room for 40 attendees.", ownerId: "jordan", ownerVersion: 0, status: "accepted", dependsOn: [], waitingOn: null, waitingOnPersonId: null, ruleIds: [], timing: undefined, anchor: { kind: "fixed", official: null, club: "2027-03-31" }, clubDeadlineOverride: "2027-03-31", taskWork: undefined }
  const other: Node = { ...room, id: PLAN_OTHER, stepKey: "club-requirements", title: "Confirm event requirements", instructions: "Share the event requirements.", ownerId: "sam", status: "done", completedOn: "2027-03-24", taskWork: { version: 1, revision: 1, files: [{ id: "requirements-file", name: "requirements.txt", size: 5, dataUrl: "data:application/octet-stream;base64,aGVsbG8=" }], drafts: [{ authorId: "sam", details: "PRIVATE unsubmitted notes", attachmentIds: [], savedOn: "2027-03-24" }], submissions: [{ id: "requirements-result", authorId: "sam", ownerVersion: 0, details: "40 attendees. Accessible room. Projector required.", attachmentIds: ["requirements-file"], savedOn: "2027-03-24" }] } }
  return applySchedule({ ...base, today: "2027-03-28", viewerId, nodes: [room, other, { ...room, id: "plan-other-event-task", eventId: "plan-other-event", title: "Another event task" }], events: [event, { ...event, id: "plan-other-event", name: "Another event" }], funding: [], org: { ...base.org, settings: { ...base.org.settings, reminderMode: "review_then_auto" } }, taskAccessGrants: [], nudges: [], notifications: [], silenceCases: [], protocolLog: [], reminderRuntime: { ...createReminderRuntime("2027-03-28"), version: 2, mailRequiredAfter: 0 } })
}

/** The reported task is a real seed Club task, deliberately without an activity. */
export function clubAgendaEntryFixture(viewerId = "alex"): DemoState {
  const state = planEntryFixture(viewerId)
  const agenda = seedDemo(undefined, "v2").nodes.find(node => node.id === "t-agenda")!
  const original = { ...agenda, ownerVersion: 0, status: "accepted" as const, taskWork: undefined, dependsOn: [], anchor: { kind: "fixed" as const, official: null, club: "2026-11-03" }, clubDeadlineOverride: "2026-11-03" }
  const other = { ...state.nodes[1], eventId: null, title: "Prepare meeting materials", completedOn: "2026-11-02" }
  return applySchedule({ ...state, today: "2026-11-03", nodes: [original, other, state.nodes[2]] })
}
