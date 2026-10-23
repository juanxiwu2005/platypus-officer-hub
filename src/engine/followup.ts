import type { DemoState, Node, ProtocolEntry, SilenceCase } from "../data/types"
import { addDays, daysBetween } from "../lib/dates"
import { applySchedule, computeSchedule } from "./schedule"
import { addNotices, leaders } from "../data/taskWorkflow"
import { buildNudge } from "../lib/nudges"

const suggestedOwner = (s: DemoState, n: Node) => s.people.filter(p => p.id !== n.ownerId).sort((a, b) => {
  const count = (id: string) => s.nodes.filter(n => n.ownerId === id && n.status !== "done").length
  const match = (id: string) => s.roles.find(r => r.id === s.people.find(p => p.id === id)?.roleId)?.fn === n.fn ? 0 : 1
  return match(a.id) - match(b.id) || count(a.id) - count(b.id) || a.id.localeCompare(b.id)
})[0]?.id

function retroNode(n: Node, c: SilenceCase, from: string): Node {
  return { ...n, id: `retro:${c.id}`, title: `Review the handover: ${n.title}`, eventId: null, stepKey: null, phase: null, ownerId: c.temporaryOwnerId ?? n.ownerId, dependsOn: [], tier: "light", estDays: 1, anchor: { kind: "followup", from, days: 7, label: "Silence protocol: retro within seven calendar days" }, recoveryFrom: undefined, clubDeadlineOverride: null, officialDeadline: null, clubDeadline: null, latestStart: null, status: "unclaimed", acceptedOn: null, assignedOn: from, completedOn: undefined, lastUpdate: null, draftLink: null, waitingOn: null, ruleIds: [], why: "Record what blocked the handover and what we can improve together.", source: "SEO Ghost Owner Protocol · day 10" }
}

/** One deterministic day at a time, including a multi-day jump. Never sends a real message. */
export function runFollowupDay(input: DemoState, today: string): DemoState {
  let s = applySchedule({ ...input, today })
  for (const n of [...s.nodes]) {
    if (n.status === "done" || !n.ownerId || n.source.startsWith("SEO Ghost Owner Protocol")) continue
    let c = s.silenceCases.find(c => c.nodeId === n.id && !c.closedOn)
    if (!c) {
      const updated = n.lastUpdate ?? n.assignedOn ?? n.acceptedOn ?? input.today
      // Future work is not overdue for updates before its latest start. The separate
      // 48-hour claim check still runs from assignment, even for a future task.
      const startedOn = (n.status === "accepted" || n.status === "unclaimed") && n.latestStart && n.latestStart > updated ? n.latestStart : updated
      c = { id: `silence:${n.id}:${startedOn}:${s.silenceCases.length}`, nodeId: n.id, ownerId: n.ownerId, startedOn, closedOn: null }
      s = { ...s, silenceCases: [...s.silenceCases, c] }
    }
    const age = daysBetween(c.startedOn, today)
    const lead = leaders(s)
    if (n.status === "unclaimed" && daysBetween(n.assignedOn ?? c.startedOn, today) >= 2)
      s = addNotices(s, n.id, lead, "claim", `“${n.title}” has not been claimed within 48 hours. Check the handover privately.`, `claim:${n.id}:${n.assignedOn ?? c.startedOn}`)
    const config = s.org.settings.silenceProtocol
    const stages = [...config.nudgeDays.map(day => ({ day, kind: "reminder" as const })), { day: config.presidentDay, kind: "private_check" as const }, { day: config.reassignDay, kind: "suggest_owner" as const }, { day: config.retroDay, kind: "recovery" as const }].sort((a, b) => a.day - b.day)
    for (const stage of stages) {
      const id = `${c.id}:${stage.kind}:${stage.day}`
      if (age < stage.day || s.protocolLog.some(e => e.id === id)) continue
      const scheduledOn = addDays(c.startedOn, stage.day)
      let recipientIds = stage.kind === "reminder" ? [n.ownerId] : lead
      let text = ""
      let candidate: string | undefined
      let retroId: string | undefined
      if (stage.kind === "reminder") {
        const reminders = s.nudges.filter(x => x.nodeId === n.id).length + s.protocolLog.filter(x => x.nodeId === n.id && x.kind === "reminder" && x.recipientIds.length).length
        const week = s.protocolLog.filter(e => e.kind === "reminder" && e.recipientIds.includes(n.ownerId!) && daysBetween(e.scheduledOn, scheduledOn) >= 0 && daysBetween(e.scheduledOn, scheduledOn) < 7).length + s.nudges.filter(x => x.sentOn <= scheduledOn && daysBetween(x.sentOn, scheduledOn) < 7 && s.nodes.find(t => t.id === x.nodeId)?.ownerId === n.ownerId).length
        if (reminders >= Math.min(3, s.org.settings.maxRemindersPerTask) || week >= 6) { text = "Reminder skipped: the task or weekly reminder limit has been reached."; recipientIds = [] }
        else { const draft = buildNudge(s, n); text = `${draft.subject}\n${draft.body}` }
      }
      if (stage.kind === "private_check") text = `Please check in privately about “${n.title}”. Ask for an update by ${addDays(scheduledOn, 1)} (24 hours in this demo).`
      if (stage.kind === "suggest_owner") {
        candidate = suggestedOwner(s, n)
        text = `Consider ${s.people.find(p => p.id === candidate)?.name ?? "another officer"} as temporary owner for “${n.title}”. Nothing changes until you approve.`
      }
      if (stage.kind === "recovery") {
        const retro = retroNode(n, c, scheduledOn)
        retroId = retro.id
        if (!s.nodes.some(x => x.id === retro.id)) s = applySchedule({ ...s, nodes: [...s.nodes, retro] })
        const plan = recoveryPreview(s, n.id, scheduledOn)
        text = `Review a recovery timeline for “${n.title}”: start ${plan?.latestStart ?? "pending"}, club deadline ${plan?.club ?? "pending"}. The ASU deadline stays ${plan?.official ?? "not applicable"}. A private retro task is ready.`
        recipientIds = [...new Set([...lead, c.temporaryOwnerId ?? n.ownerId])]
      }
      const entry: ProtocolEntry = { id, caseId: c.id, nodeId: n.id, day: stage.day, scheduledOn, recipientIds, kind: stage.kind, text, suggestedOwnerId: candidate, retroNodeId: retroId }
      s = { ...s, protocolLog: [...s.protocolLog, entry] }
      s = addNotices(s, n.id, recipientIds, "protocol", text, id)
    }
  }
  return s
}

export function advanceClock(s: DemoState, days: number): DemoState {
  if (!Number.isInteger(days) || days < 1 || days > 30) return s
  let next = s
  for (let day = 0; day < days; day++) next = runFollowupDay(next, addDays(next.today, 1))
  return next
}
export function recoveryPreview(s: DemoState, nodeId: string, from = s.today) {
  return computeSchedule({ ...s, nodes: s.nodes.map(n => n.id === nodeId ? { ...n, recoveryFrom: from } : n) }).nodes[nodeId]
}
