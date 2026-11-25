import type { DemoState, Playbook, PlaybookAnswer, PlaybookQuestion, RoleHandoff } from "./types"

/**
 * Starter questions from the club's own handoff notes (Playbook phase 1, contract item 5). Rules only, no AI.
 * For each current role, the lines its outgoing officers gave in the handoff interview (the open season and every finished
 * round in handoffHistory) become experience answers under one question per role, authored by that round's outgoing officer.
 * Idempotent: the question id is stable per role and a line that is already an answer there (even a hidden one) is not added again.
 * Lines that name a contact marked "leads only" (name, email or phone) are left out, as are the new officer's read-back lines.
 */

const MAX_QUESTION = 140
const MAX_ANSWER = 400

/** The stable question id for a role's starter question. */
export const starterQuestionId = (roleId: string) => `pq-start-${roleId}`
export const starterQuestionText = (roleName: string) => {
  const name = roleName.replace(/\s+/g, " ").trim() || "officer"
  const room = MAX_QUESTION - "What did the last  want the next one to know?".length
  return `What did the last ${name.length > room ? `${name.slice(0, room - 1).trimEnd()}…` : name} want the next one to know?`
}

const clip = (line: string) => line.length > MAX_ANSWER ? `${line.slice(0, MAX_ANSWER - 1).trimEnd()}…` : line
const norm = (t: string) => t.replace(/\s+/g, " ").trim().toLowerCase()
const digits = (t: string) => t.replace(/\D/g, "")

/** A test for "this line names a leads-only contact". */
function leadsOnlyFilter(s: DemoState): (line: string) => boolean {
  const names: string[] = [], emails: string[] = [], phones: string[] = []
  for (const c of s.contacts ?? []) {
    if (c?.visibility !== "leads") continue
    const name = norm(String(c.name ?? "").replace(/\([^)]*\)/g, ""))
    if (name.length >= 3) names.push(name)
    if (c.email?.trim()) emails.push(norm(c.email))
    if (digits(c.phone ?? "").length >= 7) phones.push(digits(c.phone))
  }
  return line => {
    const low = norm(line), num = digits(line)
    return names.some(n => low.includes(n)) || emails.some(e => low.includes(e)) || phones.some(p => num.includes(p))
  }
}

/** The questions and answers an import would add to `p` (both empty when there is nothing new). `p` is the sanitized Playbook. */
export function starterPlaybook(s: DemoState, p: Playbook): { questions: PlaybookQuestion[]; answers: PlaybookAnswer[] } {
  const questions: PlaybookQuestion[] = [], answers: PlaybookAnswer[] = []
  const takenQ = new Set(p.questions.map(q => q.id)), takenA = new Set(p.answers.map(a => a.id))
  const blocked = leadsOnlyFilter(s)
  const records: RoleHandoff[] = [...(s.handoffHistory ?? []), ...(s.handoffRoles ?? [])]
  for (const role of s.roles ?? []) {
    const lines: { text: string; authorId: string | null }[] = []
    for (const rec of records) {
      if (rec?.roleId !== role.id || !Array.isArray(rec.interview)) continue
      for (const raw of rec.interview) {
        const text = typeof raw === "string" ? clip(raw.replace(/\s+/g, " ").trim()) : ""
        if (!text || /^read-back:/i.test(text) || blocked(text)) continue
        lines.push({ text, authorId: rec.outgoingId ?? null })
      }
    }
    if (!lines.length) continue

    // The role's question: an existing one (followed through merges; skipped when the president or VP hid it) or a new one.
    const id = starterQuestionId(role.id)
    let target = p.questions.find(q => q.id === id)
    for (let hops = 0; target?.mergedInto && hops <= p.questions.length; hops++) target = p.questions.find(q => q.id === target!.mergedInto)
    if (target?.hidden) continue
    if (!target && takenQ.has(id)) continue
    const questionId = target?.id ?? id
    if (!target) {
      questions.push({ id, text: starterQuestionText(role.displayName), category: "timeline", roleIds: [role.id], policyIds: [], checklistItemIds: [], origin: "handoff", createdOn: s.today, createdBy: null })
      takenQ.add(id)
    }

    const have = new Set(p.answers.filter(a => a.questionId === questionId).map(a => norm(a.text)))
    let n = 0
    for (const line of lines) {
      if (have.has(norm(line.text))) continue
      have.add(norm(line.text))
      let aid: string
      do aid = `pa-start-${role.id}-${++n}`; while (takenA.has(aid))
      takenA.add(aid)
      answers.push({ id: aid, questionId, kind: "experience", text: line.text, authorId: line.authorId, on: s.today, status: "active", votes: { up: [], down: [] } })
    }
  }
  return { questions, answers }
}
