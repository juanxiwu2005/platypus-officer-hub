import type { TaskAttachment } from "./contracts"
import { MAX_FILES, MAX_TOTAL_BYTES, validAttachment } from "./data"
import { taskFileReference } from "./attachments"
import { draftNamespace, readTaskDraft, writeTaskDraft, type SavedTaskDraft } from "./fileStorage"

export interface DraftScope {
  workspaceKey: string
  nodeId: string
  actorId: string
  ownerId: string | null
  ownerVersion: number
  workRevision: number
  details: string
  files: TaskAttachment[]
  hasDraft: boolean
}
export interface DraftSnapshot { details: string; files: TaskAttachment[]; loading: boolean; saving: boolean; hasDraft: boolean; error: string | null; baseWorkRevision: number }
export const draftKeySuffix = (scope: Pick<DraftScope, "nodeId" | "actorId" | "ownerId" | "ownerVersion">) => JSON.stringify([scope.nodeId, scope.actorId, scope.ownerId, scope.ownerVersion])
const sessions = new Map<string, TaskDraftSession>()
let watchingClose = false

/** A draft outlives its React view, so task navigation cannot cancel an upload or a pending save. */
export class TaskDraftSession {
  private snapshot: DraftSnapshot
  private listeners = new Set<() => void>()
  private key = ""
  private loaded = false
  private revision = 0
  private generation = 0
  private written = 0
  private pendingFiles = new Map<string, { ref: TaskAttachment; blob: Blob }>()
  private timer: ReturnType<typeof setTimeout> | undefined
  private writing: Promise<void> | undefined
  private ready: Promise<void>
  constructor(readonly scope: DraftScope) {
    this.snapshot = { details: scope.details, files: scope.files, loading: true, saving: false, error: null, hasDraft: scope.hasDraft, baseWorkRevision: scope.workRevision }
    this.ready = this.load().catch(error => { this.set({ loading: false, error: this.message(error) }) })
  }
  private message(error: unknown) { return error instanceof Error ? error.message : "Draft saving failed. Your text and files are kept here; please retry." }
  private set(patch: Partial<DraftSnapshot>) { this.snapshot = { ...this.snapshot, ...patch }; for (const listener of this.listeners) listener() }
  readonly getSnapshot = () => this.snapshot
  readonly subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private async load() {
    this.key = `${await draftNamespace(this.scope.workspaceKey)}:${draftKeySuffix(this.scope)}`
    const saved = await readTaskDraft(this.key)
    if (saved) {
      if (saved.version !== 1 || !Number.isSafeInteger(saved.revision) || saved.revision < 1 || saved.nodeId !== this.scope.nodeId || saved.authorId !== this.scope.actorId || saved.ownerId !== this.scope.ownerId || saved.ownerVersion !== this.scope.ownerVersion || typeof saved.details !== "string" || saved.details.length > 20_000 || !Array.isArray(saved.files) || saved.files.length > 5 || !saved.files.every(validAttachment) || typeof saved.hasDraft !== "boolean" || !Number.isSafeInteger(saved.baseWorkRevision)) throw new Error("This saved draft needs recovery before it can be changed.")
      if (this.generation > 0 && saved.hasDraft) throw new Error("A saved draft is already present. Your current text is kept here; reopen the task to review that saved copy.")
      this.revision = saved.revision
      const alreadySubmitted = this.scope.workRevision > saved.baseWorkRevision && saved.details.trim() === this.scope.details.trim() && JSON.stringify(saved.files.map(f => f.id)) === JSON.stringify(this.scope.files.map(f => f.id))
      if (saved.hasDraft && !alreadySubmitted) this.set({ details: saved.details, files: saved.files, hasDraft: true, baseWorkRevision: saved.baseWorkRevision })
    }
    this.loaded = true
    this.set({ loading: false, error: null })
  }
  private changed() {
    this.generation++
    this.set({ saving: true, hasDraft: true, error: null })
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => { void this.flush().catch(() => {}) }, 300)
  }
  setDetails(details: string) { this.set({ details }); this.changed() }
  addFiles(files: File[]) {
    if (files.length + this.snapshot.files.length > MAX_FILES) throw new Error("Attach up to 3 files.")
    const added = files.map(file => ({ ref: taskFileReference(file), blob: file }))
    if ([...this.snapshot.files, ...added.map(f => f.ref)].reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL_BYTES) throw new Error("Keep the current attachments within 5 MB in total.")
    for (const file of added) this.pendingFiles.set(file.ref.id, file)
    this.set({ files: [...this.snapshot.files, ...added.map(f => f.ref)] })
    this.changed()
    void this.flush().catch(() => {})
  }
  removeFile(id: string) { this.pendingFiles.delete(id); this.set({ files: this.snapshot.files.filter(f => f.id !== id) }); this.changed(); void this.flush().catch(() => {}) }
  pendingBlob(file: TaskAttachment) { return this.pendingFiles.get(file.id)?.blob }
  adoptPublished(details: string, files: TaskAttachment[], revision: number) {
    if (!this.snapshot.loading && !this.snapshot.hasDraft && !this.isPending && revision !== this.snapshot.baseWorkRevision) this.set({ details, files, baseWorkRevision: revision })
  }
  get isPending() { return this.generation > this.written || !!this.writing }
  async flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = undefined }
    await this.ready
    if (this.writing) { await this.writing; return this.flush() }
    try { if (!this.loaded) await this.load() } catch (error) { this.set({ saving: false, error: this.message(error) }); throw error }
    if (this.generation === this.written) return
    const generation = this.generation, current = this.snapshot
    const bytes = [...this.pendingFiles.values()].filter(f => current.files.some(x => x.id === f.ref.id))
    const draft: SavedTaskDraft = { key: this.key, version: 1, revision: this.revision, nodeId: this.scope.nodeId, authorId: this.scope.actorId, ownerId: this.scope.ownerId, ownerVersion: this.scope.ownerVersion, baseWorkRevision: current.baseWorkRevision, details: current.details, files: current.files, hasDraft: current.hasDraft, updatedAt: Date.now() }
    this.set({ saving: true, error: null })
    this.writing = writeTaskDraft(draft, this.revision, bytes).then(saved => {
      this.revision = saved.revision; this.written = generation
      for (const f of bytes) this.pendingFiles.delete(f.ref.id)
      this.set({ saving: this.generation !== this.written, error: null })
    }).catch(error => { this.set({ saving: false, error: this.message(error) }); throw error }).finally(() => { this.writing = undefined })
    await this.writing
    if (this.generation !== this.written) return this.flush()
  }
  async submitted(workRevision: number) { this.set({ details: this.snapshot.details.trim(), baseWorkRevision: workRevision, hasDraft: false }); this.generation++; await this.flush() }
}
export function taskDraftSession(scope: DraftScope): TaskDraftSession {
  const key = `${scope.workspaceKey}:${draftKeySuffix(scope)}`
  let session = sessions.get(key)
  if (!session) { session = new TaskDraftSession(scope); sessions.set(key, session) }
  if (!watchingClose && typeof window !== "undefined") {
    watchingClose = true
    window.addEventListener("beforeunload", event => { if ([...sessions.values()].some(s => s.isPending)) { for (const s of sessions.values()) void s.flush().catch(() => {}); event.preventDefault(); event.returnValue = "" } })
  }
  return session
}
export async function flushWorkspaceDrafts(workspaceKey: string) { await Promise.all([...sessions.values()].filter(s => s.scope.workspaceKey === workspaceKey).map(s => s.flush())) }
