import type { DemoState, Playbook, PlaybookAnswer, PlaybookQuestion, RoleHandoff } from "./types"
import { isPlaybookId, MAX_ANSWER_TEXT, MAX_QUESTION_TEXT, starterAnswerId, starterQuestionId } from "./playbook"

/**
 * Starter questions from the club's own handoff notes (Playbook phase 1, contract item 5). Rules only, no AI.
 * For each current role, the lines its outgoing officers gave in the handoff interview (the open season and every finished
 * round in handoffHistory) become experience answers under one question per role, authored by that round's outgoing officer.
 *
 * Only the lazily loaded Playbook page imports this file (it computes the `importStarter` payload), so it stays out of the
 * startup bundle; the reducer in playbook.ts checks whatever the page sends.
 *
 * Idempotent: the question id is stable per role and each answer id is stable per role, round and line
 * (`starterAnswerId`), so an answer that is already there (even edited or merged elsewhere) is never added again.
 * Lines that name a contact marked "leads only" (a first or last name, the email or the phone number) are left out, as are
 * the new officer's read-back lines.
 */

export { starterQuestionId }
export const starterQuestionText = (roleName: string) => {
  const name = roleName.replace(/\s+/g, " ").trim() || "officer"
  const room = MAX_QUESTION_TEXT - "What did the last  want the next one to know?".length
  return `What did the last ${name.length > room ? `${name.slice(0, room - 1).trimEnd()}…` : name} want the next one to know?`
}

const clip = (line: string) => line.length > MAX_ANSWER_TEXT ? `${line.slice(0, MAX_ANSWER_TEXT - 1).trimEnd()}…` : line
const norm = (t: string) => t.replace(/\s+/g, " ").trim().toLowerCase()
const digits = (t: string) => t.replace(/\D/g, "")
const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/**
 * A test for "this line names a leads-only contact": any part of the name of three letters or more as a whole word (any case),
 * the email address, or the phone number's digits (however they are written in the line).
 */
function leadsOnlyFilter(s: DemoState): (line: string) => boolean {
  const names = new Set<string>(), emails: string[] = [], phones: string[] = []
  for (const c of s.contacts ?? []) {
    if (c?.visibility !== "leads") continue
    for (const part of String(c.name ?? "").replace(/\([^)]*\)/g, " ").split(/[^\p{L}'-]+/u)) {
      const token = part.replace(/^['-]+|['-]+$/g, "")
      if ([...token].length >= 3) names.add(token.toLowerCase())
    }
    if (c.email?.trim()) emails.push(norm(c.email))
    if (digits(c.phone ?? "").length >= 7) phones.push(digits(c.phone))
  }
  // A whole word: not preceded or followed by a letter (an apostrophe after the name, "Morgan's", still counts as the name).
  const word = names.size ? new RegExp(`(?<!\\p{L})(?:${[...names].map(escape).join("|")})(?!\\p{L})`, "iu") : null
  return line => {
    const low = norm(line), num = digits(line)
    return (!!word && word.test(line)) || emails.some(e => low.includes(e)) || phones.some(p => num.includes(p))
  }
}

/**
 * The handoff records with a stable round key each: the season id (without its "season:" prefix, or "none") and the record's place
 * among that role's records of the same season, oldest first. handoffHistory only grows and the open season's records come after it,
 * so a round keeps its key when it finishes and moves into handoffHistory.
 */
function rounds(s: DemoState): { rec: RoleHandoff; round: string }[] {
  const seen = new Map<string, number>()
  const open = (s.handoffRoles ?? []).map(rec => ({ ...rec, season: s.handoff?.id ?? null }))
  return [...(s.handoffHistory ?? []), ...open].flatMap(rec => {
    if (!rec || typeof rec.roleId !== "string") return []
    const season = (typeof rec.season === "string" && rec.season ? rec.season.replace(/^season:/, "") : "none").replace(/[^A-Za-z0-9_.:-]/g, "_")
    const key = `${rec.roleId} ${season}`, n = seen.get(key) ?? 0
    seen.set(key, n + 1)
    return [{ rec, round: `${season}.${n}` }]
  })
}

/** The questions and answers an import would add to `p` (both empty when there is nothing new). `p` is the sanitized Playbook. */
export function starterPlaybook(s: DemoState, p: Playbook): { questions: PlaybookQuestion[]; answers: PlaybookAnswer[] } {
  const questions: PlaybookQuestion[] = [], answers: PlaybookAnswer[] = []
  const takenQ = new Set(p.questions.map(q => q.id)), takenA = new Set(p.answers.map(a => a.id))
  const blocked = leadsOnlyFilter(s)
  const all = rounds(s)
  for (const role of s.roles ?? []) {
    const lines: { id: string; text: string; authorId: string | null }[] = []
    for (const { rec, round } of all) {
      if (rec.roleId !== role.id || !Array.isArray(rec.interview)) continue
      rec.interview.forEach((raw, i) => {
        const text = typeof raw === "string" ? clip(raw.replace(/\s+/g, " ").trim()) : ""
        const id = starterAnswerId(role.id, round, i)
        // An id the Playbook would not keep (an unusually long role id or season) is left out rather than failing the whole import.
        if (!text || /^read-back:/i.test(text) || blocked(text) || !isPlaybookId(id)) return
        lines.push({ id, text, authorId: rec.outgoingId ?? null })
      })
    }
    const fresh = lines.filter(l => !takenA.has(l.id))
    if (!fresh.length) continue

    // The role's question: an existing one (followed through merges) or a new one.
    const id = starterQuestionId(role.id)
    if (!isPlaybookId(id)) continue
    let target = p.questions.find(q => q.id === id)
    for (let hops = 0; target?.mergedInto && hops <= p.questions.length; hops++) target = p.questions.find(q => q.id === target!.mergedInto)
    if (!target && takenQ.has(id)) continue
    const questionId = target?.id ?? id
    if (!target) {
      questions.push({ id, text: starterQuestionText(role.displayName), category: "timeline", roleIds: [role.id], policyIds: [], checklistItemIds: [], origin: "handoff", createdOn: s.today, createdBy: null })
      takenQ.add(id)
    }
    for (const line of fresh) {
      takenA.add(line.id)
      answers.push({ id: line.id, questionId, kind: "experience", text: line.text, authorId: line.authorId, on: s.today, status: "active", votes: { up: [], down: [] } })
    }
  }
  return { questions, answers }
}
