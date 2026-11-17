import type { DemoState, Event, Node } from "../data/types"
import { isOfficer } from "../data/permissions"
import { fmtShort, fromISO, toISO } from "../lib/dates"
import { taskActionLink } from "./actionLinks"
import type { ReminderInput, ReminderPerson, ReminderRuntime, ReminderTaskFacts } from "./contracts"

const text = (value: string) => value.trim().replace(/\s+/g, " ")
const sentence = (value: string) => /[.!?]$/.test(value) ? value : `${value}.`

/** Format an existing event date only; no deadline is computed by this adapter. */
function eventDay(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = fromISO(value)
  return Number.isFinite(date.getTime()) && toISO(date) === value ? fmtShort(value) : null
}

function requirement(node: Node, event: Event | undefined): string {
  const count = event && Number.isInteger(event.headcount) && event.headcount > 0 ? ` for ${event.headcount} attendees` : ""
  const name = event?.name.trim()
  const day = event && eventDay(event.date)
  const context = `${name ? ` for ${name}` : ""}${day ? ` on ${day}` : ""}`
  switch (node.stepKey) {
    case "venue": return event?.venue === "offcampus"
      ? `Confirm the venue${count}${context} and record its location and booking confirmation.`
      : `Reserve a room${count}${context} and record the booking confirmation.`
    case "registry": return `Register the event${context} and record the submission confirmation.`
    case "quotes":
    case "quote": return `Collect the required vendor quotes${context} and save them with the task.`
    case "budget": return `Prepare the budget${context}, including expected costs and the funding source.`
    case "budgetRequest":
    case "usg": return `Submit the budget request${context} and record its confirmation or current status.`
    case "purchaseRequest":
    case "ritm": return `Submit the purchase request${context} and record its confirmation or current status.`
    case "sap":
    case "speakerPacket":
    case "usgspeaker": return `Collect the speaker scope and required agreement information${context}, and record the submission status.`
    case "headcount": return `Complete “${text(node.title)}”${context} using the confirmed attendance count.`
    case "feedback": return `Collect feedback${context} and record the main lessons for the next event.`
    default: return sentence(`${text(node.title)}${context}`)
  }
}

function importance(state: DemoState, node: Node, event: Event | undefined): string {
  const why = text(node.why)
  if (why) return sentence(why)
  const downstream = state.nodes.filter(n => n.dependsOn.includes(node.id)).sort((a, b) => a.id.localeCompare(b.id))[0]
  if (downstream) return `This task is a prerequisite for “${text(downstream.title)}”.`
  return event?.name.trim() ? `This task is part of the plan for ${event.name.trim()}.` : "This task is part of the club's work."
}

/** Rule-only facts shared by the schedule, mail preview and future single-task page. */
export function buildReminderFacts(state: DemoState, nodeId: string): ReminderTaskFacts | null {
  const node = state.nodes.find(n => n.id === nodeId)
  if (!node) return null
  const event = state.events.find(e => e.id === node.eventId)
  // A known campus entry is unsuitable when this event explicitly uses an off-campus venue.
  const actionLink = node.stepKey === "venue" && event?.venue === "offcampus" ? null : taskActionLink(node)
  return {
    nodeId: node.id,
    eventId: event?.id ?? null,
    eventName: event?.name ?? null,
    eventDate: event?.date ?? null,
    title: node.title,
    requirement: requirement(node, event),
    importance: importance(state, node, event),
    ownerId: node.ownerId,
    ownerVersion: node.ownerVersion ?? 0,
    status: node.status,
    due: node.clubDeadline,
    startOn: node.latestStart,
    waitingOn: node.waitingOn,
    waitingOnPersonId: node.waitingOnPersonId ?? null,
    actionLink,
    source: node.source,
    planKey: JSON.stringify([node.id, node.ownerId, node.ownerVersion ?? 0, node.clubDeadline, node.latestStart]),
  }
}

/** Former and incoming officers remain identifiable for history but cannot receive a new automatic request. */
export function reminderPeople(state: DemoState): ReminderPerson[] {
  return state.people.map(person => {
    const active = isOfficer(person)
    const role = state.roles.find(r => r.id === person.roleId && r.holderId === person.id)
    return {
      id: person.id, name: person.name, email: person.email, active,
      lead: active && (role?.fn === "president" || role?.fn === "vice_president"),
      channel: person.channels[0] ?? "email",
    }
  })
}

/** Adapt the current snapshot without running an engine, writing storage or changing the runtime. */
export function buildReminderInput(state: DemoState, runtime: ReminderRuntime): ReminderInput {
  return {
    today: state.today,
    mode: state.org.settings.reminderMode ?? null,
    maxPerTask: state.org.settings.maxRemindersPerTask,
    people: reminderPeople(state),
    tasks: state.nodes.flatMap(node => {
      const facts = buildReminderFacts(state, node.id)
      return facts ? [facts] : []
    }),
    runtime,
  }
}
