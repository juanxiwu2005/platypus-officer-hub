import type { DemoState, Event, Node } from "../data/types"
import { isOfficer } from "../data/permissions"
import { fmtShort, fromISO, toISO } from "../lib/dates"
import { taskActionLink } from "./actionLinks"
import type { ReminderInput, ReminderPerson, ReminderRuntime, ReminderTaskFacts } from "./contracts"

const text = (value: string) => value.trim().replace(/\s+/g, " ")
const sentence = (value: string) => /[.!?]$/.test(value) ? value : `${value}.`

/** Format only a valid supplied event date. */
function eventDay(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  return toISO(fromISO(value)) === value ? fmtShort(value) : null
}

function requirement(node: Node, event: Event | undefined): string {
  if (node.instructions?.trim()) return text(node.instructions)
  const count = event && Number.isInteger(event.headcount) && event.headcount > 0 ? ` for ${event.headcount} attendees` : ""
  const name = event?.name.trim()
  const day = event && eventDay(event.date)
  const context = `${name ? ` for ${name}` : ""}${day ? ` on ${day}` : ""}`
  const submit = (kind: string) => `Submit the ${kind} request${context} and record its confirmation or current status.`
  switch (node.stepKey) {
    case "venue": {
      const outside = event?.venue === "offcampus"
      return `${outside ? "Confirm the venue" : "Reserve a room"}${count}${context} and record ${outside ? "its location and" : "the"} booking confirmation.`
    }
    case "registry": return `Register the event${context}; record confirmation.`
    case "quotes":
    case "quote": return `Collect required vendor quotes${context}; attach them to the task.`
    case "budget": return `Prepare the budget${context}: expected costs and funding source.`
    case "budgetRequest":
    case "usg": return submit("budget")
    case "purchaseRequest":
    case "ritm": return submit("purchase")
    case "sap":
    case "speakerPacket":
    case "usgspeaker": return `Collect speaker scope and agreement requirements${context}; record submission status.`
    case "headcount": return `Complete “${text(node.title)}”${context} using the confirmed attendance count.`
    case "feedback": return `Collect feedback${context}; save lessons for the next event.`
    default: return sentence(`${text(node.title)}${context}`)
  }
}

function importance(state: DemoState, node: Node, event: Event | undefined): string {
  const why = text(node.why)
  if (why) return sentence(why)
  const downstream = state.nodes.filter(n => n.dependsOn.includes(node.id)).sort((a, b) => a.id.localeCompare(b.id))[0]
  if (downstream) return `“${text(downstream.title)}” depends on this task.`
  return `Part of ${event?.name.trim() ? `the plan for ${event.name.trim()}` : "the club's work"}.`
}

/** Facts for rules, mail and task pages. */
export function buildReminderFacts(state: DemoState, nodeId: string): ReminderTaskFacts | null {
  const node = state.nodes.find(n => n.id === nodeId)
  if (!node) return null
  const event = state.events.find(e => e.id === node.eventId)
  // Campus routing does not apply to off-campus venues.
  const actionLink = node.stepKey === "venue" && event?.venue === "offcampus" ? null : taskActionLink(node)
  return {
    nodeId: node.id,
    eventId: event?.id ?? null,
    eventName: event?.name ?? null,
    eventDate: event?.date ?? null,
    title: node.title,
    requirement: requirement(node, event),
    completionCriteria: node.completionCriteria?.trim() || null,
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

/** Keep identities for history; only current officers are active. */
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

/** Adapt facts without effects or runtime changes. */
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
