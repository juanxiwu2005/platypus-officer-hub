import type { DemoState, Node } from "../data/types"
import { isOfficer, isPresident } from "../data/permissions"
import { replyToTask } from "../data/taskWorkflow"
import { isBudgetControlledNode } from "../engine/eventBudget"
import type { TaskAttachment, TaskExternalLink, TaskWork, TaskWorkInput } from "./contracts"
import type { SaveProblem } from "../data/store"

export const MAX_FILE_BYTES = 2 * 1024 * 1024, MAX_FILES = 3, MAX_TOTAL_BYTES = 5 * 1024 * 1024
/** A refused save says its cause when the store knows it (another tab, or this browser's storage); otherwise the screen's own "Try again" line. */
export const saveFailedText = (problem: SaveProblem, fallback: string) => problem === "other-tab" ? "Changed in another tab. Reload." : problem === "storage" ? "Can't save in this browser." : fallback
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v)
export const safeTaskUrl = (v: string) => { try { const u = new URL(v); return ["https:", "http:"].includes(u.protocol) && !u.username && !u.password } catch { return false } }
export function validTaskLinks(v: unknown): v is TaskExternalLink[] {
  return Array.isArray(v) && v.length <= 8 && v.every(x => object(x) && typeof x.label === "string" && !!x.label.trim() && x.label.length <= 100 && typeof x.url === "string" && x.url.length <= 2048 && safeTaskUrl(x.url))
}
export function validAttachment(v: unknown): v is TaskAttachment {
  if (!object(v) || typeof v.id !== "string" || !/^[\w-]{1,100}$/.test(v.id) || typeof v.name !== "string" || !/^.{1,160}\.(pdf|txt|md|csv|docx|xlsx|png|jpe?g|webp)$/i.test(v.name) || !Number.isInteger(v.size) || (v.size as number) < 1 || (v.size as number) > MAX_FILE_BYTES) return false
  if (v.dataUrl === undefined) return typeof v.blobKey === "string" && /^[\w-]{1,100}$/.test(v.blobKey)
  if (typeof v.dataUrl !== "string" || v.dataUrl.length > Math.ceil(MAX_FILE_BYTES / 3) * 4 + 100 || !/^data:application\/octet-stream;base64,[A-Za-z0-9+/]+={0,2}$/.test(v.dataUrl)) return false
  try { return atob(v.dataUrl.split(",")[1]).length === v.size } catch { return false }
}
const emptyWork = (): TaskWork => ({ version: 1, revision: 0, files: [], drafts: [], submissions: [] })
/** Unknown or corrupt work is retained; it must never silently become a blank editable submission. */
export function taskWork(node: Node): TaskWork | null {
  const w = node.taskWork
  if (w === undefined) return emptyWork()
  if (!object(w) || ![1, 2].includes(w.version) || !Number.isSafeInteger(w.revision) || w.revision < 0 || !Array.isArray(w.files) || !w.files.every(validAttachment) || !Array.isArray(w.drafts) || !Array.isArray(w.submissions)) return null
  const ids = new Set(w.files.map(f => f.id))
  if (ids.size !== w.files.length) return null
  for (const r of [...w.drafts, ...w.submissions]) if (!object(r) || typeof r.authorId !== "string" || typeof r.details !== "string" || r.details.length > 20_000 || typeof r.savedOn !== "string" || !Array.isArray(r.attachmentIds) || r.attachmentIds.length > 5 || !r.attachmentIds.every(id => typeof id === "string" && ids.has(id))) return null
  if (w.submissions.some(r => typeof r.id !== "string" || !Number.isSafeInteger(r.ownerVersion) || r.ownerVersion < 0) || new Set(w.submissions.map(r => r.id)).size !== w.submissions.length || new Set(w.drafts.map(d => d.authorId)).size !== w.drafts.length) return null
  return w
}
export const taskDefinitionKey = (n: Node) => JSON.stringify([n.title, n.instructions, n.ownerId, n.ownerVersion ?? 0, n.clubDeadline, n.clubDeadlineOverride, n.externalLinks])

/** An atomic business write: content, files and completion succeed or fail together. */
export function saveTaskWork(s: DemoState, id: string, actorId: string, input: TaskWorkInput): DemoState {
  const node = s.nodes.find(n => n.id === id), actor = s.people.find(p => p.id === actorId)
  if (!node || !actor || !isOfficer(actor) || (node.ownerId !== actorId && !isPresident(s, actorId)) || node.status === "unclaimed") return s
  const work = taskWork(node)
  if (!work || !input || work.revision !== input.expectedRevision || node.ownerId !== input.expectedOwnerId || (node.ownerVersion ?? 0) !== input.expectedOwnerVersion || typeof input.submit !== "boolean" || typeof input.details !== "string" || input.details.length > 20_000 || !Array.isArray(input.attachments) || input.attachments.length > MAX_FILES || !input.attachments.every(validAttachment) || new Set(input.attachments.map(f => f.id)).size !== input.attachments.length) return s
  const details = input.details.trim()
  if (input.attachments.reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL_BYTES) return s
  // I3 (2026-11-27): a note is optional when the submission completes the task; a Done or budget-controlled task still needs content.
  if (input.submit && !details && !input.attachments.length && (node.status === "done" || isBudgetControlledNode(node))) return s
  const files = [...work.files]
  for (const f of input.attachments) {
    const old = files.find(x => x.id === f.id)
    if (old && JSON.stringify(old) !== JSON.stringify(f)) return s
    if (!old) files.push({ ...f })
  }
  const record = { authorId: actorId, details, attachmentIds: input.attachments.map(f => f.id), savedOn: s.today }
  const drafts = work.drafts.filter(d => d.authorId !== actorId)
  const submissions = input.submit ? [...work.submissions, { ...record, id: `submission-${work.revision + 1}`, ownerVersion: node.ownerVersion ?? 0 }] : work.submissions
  if (!input.submit) drafts.push(record)
  const used = new Set([...drafts, ...submissions].flatMap(r => r.attachmentIds))
  const retained = files.filter(f => used.has(f.id))
  let next = s
  // Financial nodes can accept evidence, but Event Budget remains their completion authority.
  if (input.submit && node.status !== "done" && !isBudgetControlledNode(node)) {
    next = replyToTask(s, id, actorId, "done")
    if (next === s) return s
  }
  const updated: TaskWork = { version: retained.some(f => f.blobKey) ? 2 : work.version, revision: work.revision + 1, files: retained, drafts, submissions }
  return { ...next, nodes: next.nodes.map(n => n.id === id ? { ...n, taskWork: updated, ...(input.submit ? { lastUpdate: s.today } : {}) } : n) }
}
